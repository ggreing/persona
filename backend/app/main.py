from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .db.mongo import db as mongo_db
from .routers import chat, persona, voice, tts, analysis # 라우터들을 임포트합니다.

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    애플리케이션 시작 시 데이터베이스에 연결하고, 종료 시 연결을 해제합니다.
    """
    await mongo_db.connect()
    yield
    await mongo_db.disconnect()

# FastAPI 애플리케이션 생성
app = FastAPI(
    title="Sales Persona AI Backend",
    description="새로운 아키텍처로 개편된 세일즈 페르소나 AI 백엔드",
    version="2.0.0",
    lifespan=lifespan
)

# CORS 미들웨어 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 실제 프로덕션 환경에서는 특정 도메인만 허용해야 합니다.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", tags=["Root"])
async def read_root():
    """
    루트 엔드포인트. API 서버가 활성 상태인지 확인합니다.
    """
    return {"message": "Sales Persona AI Backend v2 is running."}

# 기능별 라우터 포함
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(persona.router, prefix="/api", tags=["Persona"])
app.include_router(voice.router, prefix="/api", tags=["Voice Chat"])
app.include_router(tts.router, prefix="/api", tags=["TTS"])
app.include_router(analysis.router, prefix="/api", tags=["Analysis"])
