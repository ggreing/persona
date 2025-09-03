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
    persona_service: PersonaDBService = Depends(get_persona_db_service),
    ai_service: SalesPersonaAIService = Depends(get_ai_service)
):
    """
    새로운 대화 세션을 시작합니다.
    - MongoDB에 ChatSession 문서를 생성합니다.
    - AI 페르소나의 첫 인사를 생성하여 반환합니다.
    """
    try:
        # persona_id로 페르소나 정보를 Qdrant에서 실제로 가져옵니다.
        # get_all_personas는 리스트를 반환하므로, ID로 특정 페르소나를 찾는 함수가 필요합니다.
        # 지금은 임시로 첫 번째 페르소나를 가져오거나, 필터링합니다.
        all_personas = await persona_service.get_all_personas()
        persona = next((p for p in all_personas if p.id == init_request.persona_id), None)
        if not persona:
            raise HTTPException(status_code=404, detail="페르소나를 찾을 수 없습니다.")

        # 1. 세션 생성
        session = await history_service.create_session(init_request.user_id, init_request.persona_id)

        # 2. AI의 첫 인사 생성
        # TODO: ai_persona_service에 generate_first_greeting 메서드 구현 필요
        greeting = f"안녕하세요! {persona.goal}에 대해 궁금한 점이 있으신가요?"

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
    history_service: ChatHistoryService = Depends(get_chat_history_service),
    persona_service: PersonaDBService = Depends(get_persona_db_service)
):
    """
    지정된 세션에서 AI와 대화를 스트리밍 방식으로 주고받습니다. (SSE)
    """
    try:
        # session_id를 통해 persona_id를 조회하고, persona 객체를 가져옵니다.
        session = await history_service.get_session_history(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

        all_personas = await persona_service.get_all_personas()
        persona = next((p for p in all_personas if p.id == session.persona_id), None)
        if not persona:
            raise HTTPException(status_code=404, detail="페르소나를 찾을 수 없습니다.")

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
