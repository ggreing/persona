from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from ..core.ai_persona import sales_persona_ai_service, SalesPersonaAIService
from ..core.chat_history import chat_history_service, ChatHistoryService
from ..services.storage import storage_service, StorageService
from ..models.mongo_models import AnalysisReport

router = APIRouter()

# Jinja2 템플릿 설정
templates = Jinja2Templates(directory="backend/app/templates")

# --- 의존성 주입 ---
def get_ai_service():
    return sales_persona_ai_service

def get_history_service():
    return chat_history_service

def get_storage_service():
    return storage_service

# --- API 엔드포인트 ---

@router.get("/analysis/report/{session_id}", response_class=HTMLResponse)
async def get_analysis_report(
    session_id: str,
    request: Request,
    history_service: ChatHistoryService = Depends(get_history_service)
):
    """
    지정된 세션의 분석 리포트를 HTML 페이지로 렌더링합니다.
    """
    chat_session = await history_service.get_session_history(session_id)

    if not chat_session or not chat_session.analysis:
        raise HTTPException(status_code=404, detail="해당 세션의 분석 리포트를 찾을 수 없습니다.")

    return templates.TemplateResponse(
        "report.html",
        {"request": request, "report": chat_session.analysis}
    )


@router.post("/analysis/{session_id}", response_model=AnalysisReport)
async def trigger_analysis(
    session_id: str,
    ai_service: SalesPersonaAIService = Depends(get_ai_service),
    history_service: ChatHistoryService = Depends(get_history_service),
    storage: StorageService = Depends(get_storage_service)
):
    """
    지정된 세션의 대화를 분석하고, 결과를 DB에 저장하며,
    전체 대화 로그를 MinIO에 텍스트 파일로 저장합니다.
    """
    try:
        # 1. AI 서비스를 통해 대화 분석 수행
        # 이 메서드는 내부적으로 결과를 DB에 저장합니다.
        summary_text, score = await ai_service.analyze_conversation(session_id)

        if score == 0.0 and "대화 내용이 없어" in summary_text:
            raise HTTPException(status_code=404, detail="분석할 대화 내용이 없습니다.")

        # 2. 전체 대화 기록을 가져옴
        chat_session = await history_service.get_session_history(session_id)
        if not chat_session:
            raise HTTPException(status_code=404, detail="세션 정보를 찾을 수 없습니다.")

        # 3. 대화 로그를 텍스트 파일로 변환
        transcript = f"대화 세션: {session_id}\n"
        transcript += f"사용자: {chat_session.user_id}\n"
        transcript += f"페르소나: {chat_session.persona_id}\n"
        transcript += f"분석 점수: {score}\n\n"
        transcript += "=" * 30 + "\n"
        for message in chat_session.messages:
            timestamp = message.timestamp.strftime("%Y-%m-%d %H:%M:%S")
            transcript += f"[{timestamp}] {message.role}: {message.content}\n"

        # 4. MinIO에 대화 로그 업로드
        bucket_name = "conversation-logs"
        object_name = f"{session_id}.txt"
        storage.upload_file(
            bucket_name=bucket_name,
            object_name=object_name,
            data=transcript.encode('utf-8'),
            content_type="text/plain"
        )

        print(f"세션 {session_id}의 대화 로그가 MinIO에 저장되었습니다.")

        # 5. 저장된 분석 결과 반환
        return chat_session.analysis

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"분석 처리 중 오류 발생: {str(e)}")
