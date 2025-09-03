from ..db.mongo import get_database
from ..models.mongo_models import ChatSession, ChatMessage, AnalysisReport
from typing import List, Optional

class ChatHistoryService:
    async def create_session(self, user_id: str, persona_id: str) -> ChatSession:
        db = await get_database()
        session = ChatSession(user_id=user_id, persona_id=persona_id)
        await db["chat_sessions"].insert_one(session.dict())
        return session

    async def add_message(self, session_id: str, role: str, content: str, requires_tts: bool = False):
        db = await get_database()
        status = "pending" if requires_tts and role == "ai" else "not_required"
        message = ChatMessage(role=role, content=content, tts_status=status)
        await db["chat_sessions"].update_one(
            {"id": session_id},
            {"$push": {"messages": message.dict()}}
        )

    async def get_session_history(self, session_id: str) -> Optional[ChatSession]:
        db = await get_database()
        session_data = await db["chat_sessions"].find_one({"id": session_id})
        if session_data:
            return ChatSession(**session_data)
        return None

    async def update_session_analysis(self, session_id: str, analysis: AnalysisReport, score: float):
        db = await get_database()
        await db["chat_sessions"].update_one(
            {"id": session_id},
            {"$set": {"analysis": analysis.dict(), "score": score}}
        )

chat_history_service = ChatHistoryService()
