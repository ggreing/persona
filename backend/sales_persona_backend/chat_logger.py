# 📁 backend/sales_persona_backend/chat_logger.py

from fastapi import APIRouter, Request
from pydantic import BaseModel
from datetime import datetime
from prisma import Prisma

router = APIRouter()
db = Prisma()

class ChatMessage(BaseModel):
    session_id: str
    user_id: str
    persona_id: str
    role: str  # 'seller' or 'ai'
    content: str
    timestamp: datetime

@router.post("/chat/save")
async def save_chat_message(message: ChatMessage):
    await db.connect()

    # 현재는 ChatSession.score 만 저장되는 구조이므로, 메시지는 임시 로그로 저장하거나 외부로 출력
    print(f"💾 저장된 메시지: {message.role} - {message.content} [{message.timestamp}]")

    # 예: 추후 세부 메시지를 DB 저장하려면 ChatMessage 모델을 schema.prisma에 추가해야 함

    await db.disconnect()
    return {"status": "ok"}
