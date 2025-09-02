from fastapi import APIRouter

router = APIRouter()

# TODO: TTS 모델 변경 및 파라미터 조절을 위한 엔드포인트 구현
@router.post("/tts/config")
async def configure_tts():
    """
    TTS 설정을 변경합니다 (모델, 기본 목소리 등).
    """
    return {"message": "TTS configuration endpoint to be implemented."}

@router.get("/tts/models")
async def list_tts_models():
    """
    사용 가능한 TTS 모델 목록을 반환합니다.
    """
    return ["GoogleTTS", "LocalTTS (Not Implemented)"]
