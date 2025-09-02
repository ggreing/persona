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


# --- TTS 결과 확인을 위한 폴링 엔드포인트 ---

class AudioStatusResponse(BaseModel):
    status: str # "processing", "ready", "error"
    audio_url: Optional[str] = None # status가 'ready'일 때 MinIO의 음성 파일 URL
    error_message: Optional[str] = None

@router.get("/chat/{session_id}/audio-status", response_model=AudioStatusResponse)
async def get_audio_status(session_id: str):
    """
    클라이언트가 AI의 음성 응답 생성이 완료되었는지 주기적으로 확인(polling)하는 엔드포인트.
    - 실제 구현에서는 이 엔드포인트가 특정 세션의 TTS 작업 상태를 DB나 캐시에서 조회해야 합니다.
    - 작업이 완료되면 MinIO에 저장된 음성 파일의 URL을 반환합니다.
    """
    # TODO: 실제 상태 조회 로직 구현 필요
    # 1. DB에서 session_id에 해당하는 최신 AI 메시지를 찾습니다.
    # 2. 해당 메시지에 대한 TTS 작업 상태를 확인합니다 (예: 'processing', 'completed', 'failed').
    # 3. 'completed' 상태이면, MinIO URL을 생성하여 반환합니다.

    # 임시 목업(mock) 응답
    import random
    if random.random() < 0.3:
        return AudioStatusResponse(status="processing")
    else:
        # 실제로는 storage_service를 통해 생성된 URL이어야 함
        mock_url = f"http://localhost:9000/tts-audio/{session_id}-{random.randint(1000, 9999)}.mp3"
        return AudioStatusResponse(status="ready", audio_url=mock_url)
