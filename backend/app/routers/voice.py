from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from ..services.messaging import messaging_service, MessagingService
import json

router = APIRouter()

# --- 의존성 주입 ---
def get_messaging_service():
    return messaging_service

# --- WebSocket 엔드포인트 ---

@router.websocket("/ws/voice-chat/{session_id}")
async def voice_chat_endpoint(
    websocket: WebSocket,
    session_id: str,
    mq_service: MessagingService = Depends(get_messaging_service)
):
    """
    음성 채팅을 위한 WebSocket 엔드포인트.
    - 클라이언트로부터 STT 변환된 텍스트를 JSON 형태로 수신합니다.
    - 수신된 텍스트를 RabbitMQ의 'stt_text_queue'로 발행합니다.
    - AI 처리 결과(TTS 음성 파일)는 별도의 폴링 방식으로 클라이언트가 가져갑니다.
    """
    await websocket.accept()
    print(f"클라이언트 {websocket.client.host}와 세션 {session_id}에 대한 WebSocket 연결이 수립되었습니다.")

    try:
        while True:
            # 클라이언트로부터 텍스트 데이터 수신 (STT 결과로 가정)
            data = await websocket.receive_text()

            # 수신된 데이터를 RabbitMQ로 전송
            # 메시지 형식: {"session_id": "...", "text": "..."}
            message_payload = {
                "session_id": session_id,
                "text": data
            }
            mq_service.publish_message(
                queue_name="stt_text_queue",
                message=json.dumps(message_payload)
            )

            # 클라이언트에게 메시지가 성공적으로 전달되었음을 알림
            await websocket.send_text(f"메시지가 AI 서버로 전달되었습니다: {data}")

    except WebSocketDisconnect:
        print(f"클라이언트 {websocket.client.host}와의 WebSocket 연결이 끊어졌습니다 (세션: {session_id}).")
    except Exception as e:
        print(f"WebSocket 처리 중 오류 발생 (세션: {session_id}): {e}")
        await websocket.close(code=1011)


from pydantic import BaseModel
from typing import Optional
from ..core.chat_history import chat_history_service, ChatHistoryService
from ..db.mongo import get_database

# --- TTS 결과 확인을 위한 폴링 엔드포인트 ---

class AudioStatusResponse(BaseModel):
    status: str # "processing", "ready", "error", "not_found"
    audio_url: Optional[str] = None # status가 'ready'일 때 MinIO의 음성 파일 URL
    error_message: Optional[str] = None

@router.get("/chat/{session_id}/audio-status", response_model=AudioStatusResponse)
async def get_audio_status(
    session_id: str,
    history_service: ChatHistoryService = Depends(get_chat_history_service)
):
    """
    클라이언트가 AI의 음성 응답 생성이 완료되었는지 주기적으로 확인(polling)하는 엔드포인트.
    DB에서 마지막 AI 메시지의 tts_status를 확인하여 상태를 반환합니다.
    """
    session = await history_service.get_session_history(session_id)
    if not session or not session.messages:
        return AudioStatusResponse(status="not_found", error_message="세션을 찾을 수 없습니다.")

    # 마지막 AI 메시지를 찾습니다.
    last_ai_message = next((msg for msg in reversed(session.messages) if msg.role == 'ai'), None)
    if not last_ai_message:
        return AudioStatusResponse(status="processing", error_message="AI 응답을 기다리는 중입니다.")

    status = last_ai_message.tts_status

    if status == "pending":
        # 실제 시스템에서는 별도의 워커가 이 상태를 변경해야 합니다.
        # 여기서는 워커를 시뮬레이션하여, 'pending' 상태를 발견하면 'completed'로 변경합니다.
        print(f"시뮬레이션: 세션 {session_id}의 TTS 작업을 'completed'로 변경합니다.")
        db = await get_database()

        # 가짜 오디오 URL 생성
        audio_url = f"http://localhost:9000/tts-audio/{session_id}-{last_ai_message.id}.mp3"

        await db["chat_sessions"].update_one(
            {"id": session_id, "messages.id": last_ai_message.id},
            {"$set": {"messages.$.tts_status": "completed", "messages.$.audio_url": audio_url}}
        )
        return AudioStatusResponse(status="ready", audio_url=audio_url)

    elif status == "completed":
        return AudioStatusResponse(status="ready", audio_url=last_ai_message.audio_url)

    elif status == "failed":
        return AudioStatusResponse(status="error", error_message="TTS 생성에 실패했습니다.")

    else: # "not_required" 또는 그 외
        return AudioStatusResponse(status="processing")
