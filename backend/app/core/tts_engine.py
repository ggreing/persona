import re
import os
import json
import httpx
import base64
from abc import ABC, abstractmethod
from typing import Dict, Any, AsyncGenerator, Tuple

from google.cloud import texttospeech
from google.oauth2 import service_account
from google.auth.transport.requests import Request as GoogleRequest
from google.auth import default

# --- 1. TTS 모델 인터페이스 및 구현 ---

class BaseTTSModel(ABC):
    """
    모든 TTS 모델이 구현해야 하는 기본 인터페이스를 정의하는 추상 기본 클래스(ABC).
    이를 통해 TTS 엔진을 유연하게 교체할 수 있습니다.
    """
    @abstractmethod
    async def synthesize_stream(self, text: str, params: Dict[str, Any]) -> AsyncGenerator[bytes, None]:
        """스트리밍 방식으로 음성을 합성합니다."""
        yield b"" # 비동기 제너레이터임을 명시

    @abstractmethod
    async def synthesize_once(self, text: str, params: Dict[str, Any]) -> bytes:
        """한 번에 전체 음성을 합성합니다."""
        pass


class GoogleTTS(BaseTTSModel):
    """Google Cloud Text-to-Speech API를 사용하는 TTS 모델 구현체."""

    def __init__(self):
        self.credentials = self._get_google_credentials()
        self.grpc_client = texttospeech.TextToSpeechAsyncClient(credentials=self.credentials)

    def _get_google_credentials(self):
        """환경 변수 또는 기본 설정을 통해 Google Cloud 자격 증명을 가져옵니다."""
        try:
            # 1. JSON 문자열 형태의 환경 변수
            service_account_json_str = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
            if service_account_json_str:
                info = json.loads(service_account_json_str)
                return service_account.Credentials.from_service_account_info(info)
            # 2. 파일 경로 형태의 환경 변수
            service_account_file = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE")
            if service_account_file and os.path.exists(service_account_file):
                return service_account.Credentials.from_service_account_file(service_account_file)
            # 3. 로컬 환경의 기본 자격 증명 (gcloud auth application-default login)
            credentials, _ = default()
            return credentials
        except Exception as e:
            print(f"Google Cloud 인증 실패: {e}")
            return None

    async def synthesize_stream(self, text: str, params: Dict[str, Any]) -> AsyncGenerator[bytes, None]:
        """gRPC를 사용하여 스트리밍 방식으로 음성을 합성합니다."""
        if not self.credentials:
            raise ConnectionError("Google Cloud 인증에 실패했습니다.")

        request = texttospeech.StreamingSynthesizeSpeechRequest(
            input=texttospeech.SynthesisInput(text=text),
            voice=texttospeech.VoiceSelectionParams(
                language_code=params.get("language_code", "ko-KR"),
                name=params.get("voice_name")
            ),
            audio_config=texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3,
                speaking_rate=params.get("speaking_rate", 1.0),
                pitch=params.get("pitch", 0.0),
                volume_gain_db=params.get("volume_gain_db", 0.0)
            )
        )
        stream = await self.grpc_client.streaming_synthesize_speech(requests=[request])
        async for response in stream:
            yield response.audio_content

    async def synthesize_once(self, text: str, params: Dict[str, Any]) -> bytes:
        """REST API를 사용하여 한 번에 음성을 합성합니다."""
        if not self.credentials:
            raise ConnectionError("Google Cloud 인증에 실패했습니다.")

        # REST API 호출을 위해 Access Token 갱신
        auth_request = GoogleRequest()
        self.credentials.refresh(auth_request)
        access_token = self.credentials.token

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://texttospeech.googleapis.com/v1/text:synthesize",
                headers={"Authorization": f"Bearer {access_token}"},
                json={
                    "input": {"text": text},
                    "voice": {
                        "languageCode": params.get("language_code", "ko-KR"),
                        "name": params.get("voice_name")
                    },
                    "audioConfig": {
                        "audioEncoding": "MP3",
                        "speakingRate": params.get("speaking_rate", 1.0),
                        "pitch": params.get("pitch", 0.0),
                        "volumeGainDb": params.get("volume_gain_db", 0.0)
                    }
                }
            )
            response.raise_for_status()
            audio_base64 = response.json().get("audioContent")
            return base64.b64decode(audio_base64)


# --- 2. TTS 엔진 서비스 ---

class TTSEngine:
    """
    TTS 관련 로직을 총괄하는 서비스 클래스.
    텍스트 처리, 음성 스타일 결정, 모델 호출 등을 담당합니다.
    """
    def __init__(self, tts_model: BaseTTSModel):
        """
        사용할 TTS 모델의 구현체를 주입받습니다.
        """
        self.model = tts_model

    def process_text(self, text: str) -> Tuple[str, Dict[str, bool]]:
        """
        입력 텍스트에서 감정 표현을 추출하고, TTS가 읽을 순수 텍스트를 분리합니다.
        예: "안녕하세요 (웃음)" -> "안녕하세요", {"laugh": True}
        """
        emotions = {}
        # 괄호 안의 내용을 찾아 제거하고, 해당 내용으로 감정 태그를 설정합니다.
        def replace_fn(match):
            content = match.group(1).lower()
            # 간단한 키워드 매핑
            if any(k in content for k in ['웃음', '웃으며']): emotions['laugh'] = True
            elif '미소' in content: emotions['smile'] = True
            elif any(k in content for k in ['따뜻', '친근']): emotions['warm'] = True
            elif any(k in content for k in ['차분', '조용']): emotions['calm'] = True
            # ... 다른 감정 키워드 추가 ...
            else: emotions['neutral'] = True
            return ""

        processed_text = re.sub(r'[\(（]([^\)）]*)[\)）]', replace_fn, text)
        return processed_text.strip(), emotions

    def get_voice_params(self, persona: Dict = None, emotions: Dict = None, custom_params: Dict = None) -> Dict[str, Any]:
        """
        페르소나, 감정, 사용자 지정 파라미터를 조합하여 최종 음성 파라미터를 결정합니다.
        """
        params = {
            "language_code": "ko-KR",
            "voice_name": "ko-KR-Wavenet-A", # 기본값
            "speaking_rate": 1.1,
            "pitch": 0.0,
            "volume_gain_db": 0.0,
        }

        # 1. 페르소나 기반 설정 (성별, 언어 등)
        if persona:
            if "남성" in persona.get("gender", ""):
                params["voice_name"] = "ko-KR-Wavenet-D" # 남성 목소리
            # 다른 페르소나 속성에 따른 분기 추가 가능

        # 2. 감정 기반 파라미터 조정
        if emotions:
            if emotions.get('laugh') or emotions.get('smile'):
                params["pitch"] = 2.5
                params["speaking_rate"] = 1.2
            elif emotions.get('warm'):
                params["pitch"] = 1.0
            elif emotions.get('calm'):
                params["pitch"] = -1.0
                params["speaking_rate"] = 1.0
            # ... 다른 감정 분기 추가 ...

        # 3. 사용자 지정 파라미터로 덮어쓰기 (가장 높은 우선순위)
        if custom_params:
            params.update(custom_params)

        return params

    async def generate_speech(self, text: str, persona: Dict = None, custom_params: Dict = None, stream: bool = True):
        """
        전체 음성 생성 과정을 조율하는 메인 메서드.
        """
        # 1. 텍스트에서 감정 추출
        processed_text, emotions = self.process_text(text)

        # 2. 음성 파라미터 결정
        voice_params = self.get_voice_params(persona, emotions, custom_params)

        # 3. TTS 모델 호출
        if stream:
            return self.model.synthesize_stream(processed_text, voice_params)
        else:
            return await self.model.synthesize_once(processed_text, voice_params)


# --- 3. 서비스 인스턴스 생성 ---

# 사용할 TTS 모델을 선택하여 엔진을 생성합니다.
google_tts_model = GoogleTTS()
tts_engine = TTSEngine(tts_model=google_tts_model)
