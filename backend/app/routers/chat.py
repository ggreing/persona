from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List

from ..core.chat_history import chat_history_service, ChatHistoryService
from ..core.persona_db import persona_db_service, PersonaDBService
from ..core.ai_persona import sales_persona_ai_service, SalesPersonaAIService
from ..models.mongo_models import ChatSession, Persona

router = APIRouter()

# --- 의존성 주입 ---
def get_chat_history_service():
    return chat_history_service

def get_persona_db_service():
    return persona_db_service

def get_ai_service():
    return sales_persona_ai_service

# --- 요청 및 응답 모델 ---
class ChatInitiateRequest(BaseModel):
    user_id: str
    persona_id: str

class ChatInitiateResponse(BaseModel):
    session_id: str
    message: str # AI의 첫 인사

class ChatRequest(BaseModel):
    seller_msg: str

# --- API 엔드포인트 ---

@router.post("/chat/initiate", response_model=ChatInitiateResponse)
async def initiate_chat(
    init_request: ChatInitiateRequest,
    history_service: ChatHistoryService = Depends(get_chat_history_service),
    persona_service: PersonaDBService = Depends(get_persona_db_service)
):
    """
    새로운 대화 세션을 시작합니다.
    - MongoDB에 ChatSession 문서를 생성합니다.
    - AI 페르소나의 첫 인사를 생성하여 반환합니다.
    """
    try:
        # TODO: persona_id로 페르소나 정보를 Qdrant에서 실제로 가져와야 함.
        # 현재는 임시 페르소나 객체를 사용합니다.
        temp_persona_payload = {
            "id": init_request.persona_id, "gender": "여성", "age_group": "30대",
            "personality": "신중함", "tech": "중급", "goal": "가성비 좋은 TV 구매",
            "usage": "영화 감상", "type": "실용주의"
        }
        persona = Persona(**temp_persona_payload)

        # 1. 세션 생성
        session = await history_service.create_session(init_request.user_id, init_request.persona_id)

        # 2. AI의 첫 인사 생성 (이 부분은 ai_persona 서비스에 추가 필요)
        # greeting = await ai_service.generate_first_greeting(persona)
        greeting = f"안녕하세요! {persona.goal}을(를) 찾고 계신가요?" # 임시 인사

        # 3. 첫 인사를 대화 기록에 추가
        await history_service.add_message(session.id, "ai", greeting)

        return ChatInitiateResponse(session_id=session.id, message=greeting)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"대화 시작 중 오류 발생: {str(e)}")


@router.post("/chat/{session_id}/stream")
async def stream_chat(
    session_id: str,
    chat_request: ChatRequest,
    ai_service: SalesPersonaAIService = Depends(get_ai_service),
    persona_service: PersonaDBService = Depends(get_persona_db_service)
):
    """
    지정된 세션에서 AI와 대화를 스트리밍 방식으로 주고받습니다. (SSE)
    """
    try:
        # TODO: session_id를 통해 persona_id를 조회하고, persona 객체를 가져와야 함
        temp_persona_payload = {
            "id": "temp-persona", "gender": "여성", "age_group": "30대",
            "personality": "신중함", "tech": "중급", "goal": "가성비 좋은 TV 구매",
            "usage": "영화 감상", "type": "실용주의"
        }
        persona = Persona(**temp_persona_payload)

        async def event_stream():
            try:
                # AI 서비스의 스트리밍 응답을 그대로 클라이언트에 전달
                async for chunk in ai_service.stream_response(session_id, persona, chat_request.seller_msg):
                    if chunk:
                        yield f"data: {chunk.strip()}\n\n"
            except Exception as e:
                error_message = f"스트리밍 중 오류 발생: {e}"
                print(error_message)
                yield f"data: {error_message}\n\n"

        return StreamingResponse(event_stream(), media_type="text/event-stream")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"스트리밍 처리 중 오류 발생: {str(e)}")
