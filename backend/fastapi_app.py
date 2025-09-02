from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse, PlainTextResponse, Response
from pydantic import BaseModel
import uuid
import os
import base64
import httpx
import json
import re

from google.cloud import texttospeech
from google.oauth2 import service_account
from google.auth.transport.requests import Request as GoogleRequest
from google.auth import default

from sales_persona_backend.ai import SalesPersonaAI, SimpleChatbotAI
from sales_persona_backend.personas import random_persona, SCENARIOS, PERSONAS, PRESET_PERSONAS
from sales_persona_backend.router import router as main_router

from dotenv import load_dotenv
load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(main_router)

# 세션 저장소
_sessions: dict[str, SalesPersonaAI] = {}
_simple_sessions: dict[str, SimpleChatbotAI] = {}
_session_closed: dict[str, bool] = {}

@app.get("/")
def root():
    return {"message": "Sales Persona API active"}

# -----------------------
# 유틸: TTS 텍스트/음성 설정
# -----------------------
def process_text_for_tts(text: str) -> tuple[str, dict]:
    """TTS용 텍스트 처리: 괄호 안의 감정 표현 추출 및 발화용 텍스트 생성"""
    emotions = {}
    def replace_brackets(match):
        bracket_content = match.group(1)
        emotion_keywords = {
            '웃음': 'laugh', '웃으며': 'laugh', '웃고': 'laugh',
            '미소': 'smile', '미소지으며': 'smile',
            '따뜻하게': 'warm', '따뜻한': 'warm',
            '차분하게': 'calm', '차분한': 'calm',
            '밝게': 'bright', '밝은': 'bright',
            '신중하게': 'careful', '신중한': 'careful',
            '열정적으로': 'passionate', '열정적인': 'passionate',
            '부드럽게': 'soft', '부드러운': 'soft',
            '강하게': 'strong', '강한': 'strong',
            '조용히': 'quiet', '조용한': 'quiet',
            '활발하게': 'energetic', '활발한': 'energetic',
            '진지하게': 'serious', '진지한': 'serious',
            '친근하게': 'friendly', '친근한': 'friendly',
            '신뢰감 있게': 'trustworthy', '신뢰감 있는': 'trustworthy',
            '설명하듯': 'explanatory', '설명하며': 'explanatory',
            '안내하듯': 'guide', '안내하며': 'guide',
            '질문하듯': 'question', '질문하며': 'question',
            '확신하며': 'confident', '확신에 찬': 'confident',
            '공감하며': 'empathetic', '공감하는': 'empathetic',
            '격려하며': 'encouraging', '격려하는': 'encouraging',
            '칭찬하며': 'praising', '칭찬하는': 'praising',
            '위로하며': 'comforting', '위로하는': 'comforting'
        }
        for keyword, emotion in emotion_keywords.items():
            if keyword in bracket_content:
                emotions[emotion] = True
                break
        else:
            emotions['neutral'] = True
        return ""
    processed_text = re.sub(r'[\(（]([^\)）]*)[\)）]', replace_brackets, text)
    processed_text = re.sub(r'[\[【]([^\]】]*)[\]】]', replace_brackets, processed_text)
    processed_text = re.sub(r'[\{｛]([^\}｝]*)[\}｝]', replace_brackets, processed_text)
    processed_text = re.sub(r'[<＜]([^>＞]*)[>＞]', replace_brackets, processed_text)
    processed_text = re.sub(r'\s+', ' ', processed_text).strip()
    return processed_text, emotions

def adjust_voice_by_emotion(voice_name: str, emotions: dict) -> tuple[str, dict]:
    """감정에 따른 음성 조정"""
    audio_config = {
        "audioEncoding": "MP3",
        "speakingRate": 1.3,
        "pitch": 0.2,
        "volumeGainDb": 0.4
    }
    if 'laugh' in emotions or 'smile' in emotions:
        audio_config["pitch"] = 2.0; audio_config["speakingRate"] = 1.3
    elif 'warm' in emotions or 'friendly' in emotions:
        audio_config["pitch"] = 1.0; audio_config["speakingRate"] = 1.3
    elif 'calm' in emotions or 'quiet' in emotions:
        audio_config["pitch"] = -1.0; audio_config["speakingRate"] = 1.3
    elif 'bright' in emotions or 'energetic' in emotions:
        audio_config["pitch"] = 3.0; audio_config["speakingRate"] = 1.3
    elif 'serious' in emotions or 'strong' in emotions:
        audio_config["pitch"] = -2.0; audio_config["speakingRate"] = 1.1
    elif 'passionate' in emotions:
        audio_config["pitch"] = 2.0; audio_config["speakingRate"] = 1.4; audio_config["volumeGainDb"] = 2.0
    elif 'soft' in emotions:
        audio_config["pitch"] = 1.3; audio_config["speakingRate"] = 1.4; audio_config["volumeGainDb"] = -2.0
    elif 'question' in emotions:
        audio_config["pitch"] = 3.0; audio_config["speakingRate"] = 1.3
    elif 'confident' in emotions:
        audio_config["pitch"] = 1.0; audio_config["speakingRate"] = 1.3
    elif 'empathetic' in emotions or 'comforting' in emotions:
        audio_config["pitch"] = 0.0; audio_config["speakingRate"] = 1.3
    elif 'encouraging' in emotions or 'praising' in emotions:
        audio_config["pitch"] = 2.0; audio_config["speakingRate"] = 1.2; audio_config["volumeGainDb"] = 1.0

    if "Chirp3-HD" in voice_name:
        audio_config.pop("pitch", None)
    return voice_name, audio_config

VOICE_STYLES = {
    "aoede": "female", "puck": "male", "charon": "male", "kore": "female", "fenrir": "male",
    "leda": "female", "orus": "male", "zephyr": "female", "achird": "male", "algenib": "male",
    "algieba": "male", "alnilam": "male", "autonoe": "female", "callirrhoe": "female",
    "despina": "female", "enceladus": "male", "erinome": "female", "gacrux": "female",
    "iapetus": "male", "laomedeia": "female", "pulcherrima": "female", "rasalgethi": "male",
    "sadachbia": "male", "sadaltager": "male", "schedar": "male", "sulafat": "female",
    "umbriel": "male", "vindemiatrix": "female", "zubenelgenubi": "male", "achernar": "female"
}

CHIRP3_HD_VOICES = {
    "ko": {"male": "ko-KR-Chirp3-HD-Fenrir", "female": "ko-KR-Chirp3-HD-Kore"},
    "en": {"male": "en-US-Chirp3-HD-Fenrir", "female": "en-US-Chirp3-HD-Kore"},
}

def get_voice_by_persona(persona: dict = None, voice_style: str = None) -> tuple[str, str]:
    lang_code = "ko-KR"; voice_gender = "female"
    if persona:
        persona_lang = persona.get("lang", "").lower()
        if persona_lang.startswith("en"): lang_code = "en-US"
        elif persona_lang.startswith("ko"): lang_code = "ko-KR"
        g = persona.get("gender", "").lower()
        if "남성" in g or "male" in g: voice_gender = "male"
        elif "여성" in g or "female" in g: voice_gender = "female"
    key = lang_code.split("-")[0]

    if voice_style:
        style_lower = voice_style.lower()
        male_styles = {"fenrir", "puck", "charon", "orus", "achird", "algenib", "algieba", "alnilam", "iapetus", "sadachbia", "sadaltager", "schedar", "umbriel", "zubenelgenubi", "rasalgethi"}
        female_styles = {"aoede", "kore", "leda", "zephyr", "autonoe", "callirrhoe", "despina", "enceladus", "erinome", "gacrux", "laomedeia", "pulcherrima", "sulafat", "vindemiatrix", "achernar"}
        if voice_gender == "male" and style_lower not in male_styles:
            style_lower = "fenrir"
        if voice_gender == "female" and style_lower not in female_styles:
            style_lower = "kore"
        voice_name = f"{lang_code}-Chirp3-HD-{style_lower.capitalize()}"
    else:
        voice_name = CHIRP3_HD_VOICES.get(key, CHIRP3_HD_VOICES["ko"])[voice_gender]
    return lang_code, voice_name

def get_google_credentials():
    try:
        service_account_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
        if service_account_json:
            return service_account.Credentials.from_service_account_info(
                json.loads(service_account_json),
                scopes=["https://www.googleapis.com/auth/cloud-platform"])
        service_account_file = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE")
        if service_account_file and os.path.exists(service_account_file):
            return service_account.Credentials.from_service_account_file(
                service_account_file,
                scopes=["https://www.googleapis.com/auth/cloud-platform"])
        credentials, _ = default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
        return credentials
    except Exception:
        return None

def get_access_token():
    credentials = get_google_credentials()
    if not credentials:
        return None
    try:
        credentials.refresh(GoogleRequest())
        return credentials.token
    except Exception:
        return None

# -----------------------
# 입력 스키마(검증 강화)
# -----------------------
class ChatIn(BaseModel):
    session_id: str
    seller_msg: str

class ChatbotIn(BaseModel):
    session_id: str
    message: str

# -----------------------
# 일상 챗봇 (별칭: /chatbot, /api/chatbot)
# -----------------------
@app.post("/chatbot")
@app.post("/api/chatbot")  # 별칭 라우트
async def chatbot_handler(body: ChatbotIn):
    session_id = body.session_id
    user_msg = body.message

    if session_id not in _simple_sessions:
        _simple_sessions[session_id] = SimpleChatbotAI()
    engine = _simple_sessions[session_id]
    generator = engine.stream_response(user_msg)

    async def event_stream():
        try:
            for chunk in generator:
                yield f"{chunk}\n"
        except Exception as e:
            yield f"error: {str(e)}\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

# -----------------------
# AI 챗(세일즈 페르소나) (별칭: /chat, /api/chat)
# -----------------------
@app.post("/chat")
@app.post("/api/chat")  # 별칭 라우트
async def chat_handler(body: ChatIn):
    session_id = body.session_id
    seller_msg = body.seller_msg

    # 세션 종료 여부 확인
    if _session_closed.get(session_id):
        async def end_stream():
            yield "이미 종료된 대화입니다.\n"
        return StreamingResponse(end_stream(), media_type="text/event-stream")

    if session_id not in _sessions:
        _sessions[session_id] = SalesPersonaAI()
    engine = _sessions[session_id]
    generator = engine.stream_response(seller_msg)

    async def event_stream():
        try:
            full_response = ""
            for chunk in generator:
                full_response += chunk
                yield f"{chunk}\n"

            if "<대화 종료>" in full_response:
                _session_closed[session_id] = True
        except Exception as e:
            yield f"error: {str(e)}\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

@app.post("/chat/initiate")
@app.post("/api/chat/initiate")  # 별칭 라우트
async def initiate_chat(req: Request):
    data = await req.json()
    session_id = data.get("session_id")
    persona = data.get("persona")
    if not session_id:
        raise HTTPException(400, detail="session_id required")
    if session_id not in _sessions:
        if not persona:
            persona = random_persona()
        _sessions[session_id] = SalesPersonaAI(persona=persona)
    _session_closed[session_id] = False
    ai = _sessions[session_id]
    greeting = ai.generate_first_greeting()
    ai._append_history("AI", greeting)
    return JSONResponse({"message": greeting})

# -----------------------
# 페르소나 관련
# -----------------------
@app.get("/persona/random")
@app.get("/api/persona/random")
def get_random_persona():
    return random_persona()

@app.get("/scenarios")
@app.get("/api/scenarios")
def get_scenarios():
    return SCENARIOS

@app.get("/persona")
@app.get("/api/persona")
def list_personas():
    return PRESET_PERSONAS + PERSONAS

@app.post("/persona")
@app.post("/api/persona")
async def add_persona(req: Request):
    data = await req.json()
    data['id'] = str(uuid.uuid4())
    PERSONAS.append(data)
    return data

@app.delete("/persona/{persona_id}")
@app.delete("/api/persona/{persona_id}")
def delete_persona(persona_id: str):
    idx = next((i for i, p in enumerate(PERSONAS) if p.get('id') == persona_id), None)
    if idx is not None:
        PERSONAS.pop(idx)
        return {"success": True}
    raise HTTPException(404, detail="Persona not found")

# -----------------------
# 퍼포먼스 분석 및 자동 종료
# -----------------------
@app.post("/analyze")
@app.post("/api/analyze")
async def analyze(req: Request):
    data = await req.json()
    session_id = data.get("session_id")
    if not session_id:
        raise HTTPException(400, detail="session_id required")
    engine = _sessions.get(session_id)
    if not engine:
        raise HTTPException(404, detail="session not found")
    text, _score = engine.analyze_conversation()
    return PlainTextResponse(text)

@app.post("/autoclose")
@app.post("/api/autoclose")
async def autoclose(req: Request):
    data = await req.json()
    session_id = data.get("session_id")
    if not session_id:
        raise HTTPException(400, detail="session_id required")
    engine = _sessions.get(session_id)
    if not engine:
        raise HTTPException(404, detail="session not found")
    should_close, reason = engine.maybe_autoclose()
    return JSONResponse({"should_close": should_close, "reason": reason})

# -----------------------
# 일반 TTS (REST, MP3 반환)
# -----------------------
@app.post("/tts")
@app.post("/api/tts")
async def tts(req: Request):
    data = await req.json()
    text = data.get("text")
    if not text:
        raise HTTPException(400, detail="text는 필수입니다.")

    language_code = data.get("language_code", "ko-KR")
    voice_name = data.get("voice_name", "ko-KR-Chirp3-HD-Kore")
    audio_config = {"audioEncoding": "MP3"}

    access_token = get_access_token()
    if not access_token:
        raise HTTPException(status_code=503, detail="Google Cloud TTS 인증 오류")

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://texttospeech.googleapis.com/v1/text:synthesize",
            json={
                "input": {"text": text},
                "voice": {"languageCode": language_code, "name": voice_name},
                "audioConfig": audio_config
            },
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {access_token}"}
        )
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Google Cloud TTS 오류: {response.text}")

        tts_data = response.json()
        audio_base64 = tts_data.get("audioContent")
        if not audio_base64:
            raise HTTPException(500, detail="TTS 응답에 오디오 데이터가 없습니다.")
        audio_content = base64.b64decode(audio_base64)
        return Response(
            content=audio_content,
            media_type="audio/mpeg",
            headers={"Content-Length": str(len(audio_content)), "Cache-Control": "no-cache"}
        )

# -----------------------
# gRPC 기반 스트리밍 TTS
# -----------------------
@app.post("/tts/stream")
@app.post("/api/tts/stream")
async def tts_stream(req: Request):
    """
    요청 예시:
    {
      "text": "삼성전자 TV가 궁금해요.",
      "language_code": "ko-KR",
      "gender": "female",
      "voice_style": "Kore",      # (optional)
      "speaking_rate": 1.2,       # (optional)
      "pitch": 0.2                # (optional)
    }
    """
    data = await req.json()
    text = data.get("text")
    if not text:
        raise HTTPException(400, detail="text는 필수입니다.")

    language_code = data.get("language_code", "ko-KR")
    gender = data.get("gender", "female")
    style = data.get("voice_style")
    speaking_rate = float(data.get("speaking_rate", 1.3))
    pitch = float(data.get("pitch", 0.2))

    # 음성 이름 정하기
    style_map = {"female": "Kore", "male": "Fenrir"}
    if style:
        voice_name = f"{language_code}-Chirp3-HD-{style.capitalize()}"
    else:
        voice_name = f"{language_code}-Chirp3-HD-{style_map.get(gender, 'Kore')}"

    # gRPC 클라이언트 생성
    try:
        client = texttospeech.TextToSpeechClient()
    except Exception as e:
        raise HTTPException(503, detail=f"Google Cloud TTS 인증 오류: {str(e)}")

    input_text = texttospeech.SynthesisInput(text=text)
    voice = texttospeech.VoiceSelectionParams(language_code=language_code, name=voice_name)
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3,
        speaking_rate=speaking_rate,
        pitch=pitch
    )

    def request_generator():
        yield texttospeech.StreamingSynthesizeSpeechRequest(
            input=input_text,
            voice=voice,
            audio_config=audio_config
        )

    try:
        stream = client.streaming_synthesize_speech(requests=request_generator())
    except Exception as e:
        raise HTTPException(503, detail=f"Google TTS streaming 오류: {str(e)}")

    def audio_chunk_generator():
        for response in stream:
            if response.audio_content:
                yield response.audio_content

    return StreamingResponse(
        audio_chunk_generator(),
        media_type="audio/mpeg",
        headers={"Content-Disposition": "inline; filename=tts.mp3"}
    )
