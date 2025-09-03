from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid

class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not isinstance(v, str) or not v.startswith("ObjectID("):
             # For now, we'll just use string IDs
            return str(v)
        return v

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = Field(...)
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    total_sessions: int = 0
    total_messages: int = 0
    best_score: float = 0.0

class Persona(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    gender: str
    age_group: str
    personality: str
    tech: str
    goal: str
    usage: str
    type: str

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: str  # "seller" or "ai"
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    tts_status: Optional[str] = "not_required" # "not_required", "pending", "completed", "failed"
    audio_url: Optional[str] = None

class AnalysisReport(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    summary: str
    keywords: List[str]
    score: float
    created_at: datetime = Field(default_factory=datetime.utcnow)
    feedback: str

class ChatSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    persona_id: str
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None
    messages: List[ChatMessage] = []
    analysis: Optional[AnalysisReport] = None
    score: Optional[float] = None
