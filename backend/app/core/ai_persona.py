import re
import time
from typing import Iterable, Tuple, List

import google.generativeai as genai

from ..models.mongo_models import Persona, ChatSession, ChatMessage, AnalysisReport
from .memory import HybridMemoryManager
from .chat_history import chat_history_service
from .analysis_db import analysis_db_service

# TODO: .env 또는 config 파일로 이동
# from ..config import API_KEY, MODEL_NAME
API_KEY = "YOUR_API_KEY" # 실제 키로 교체해야 합니다.
MODEL_NAME = "gemini-1.5-flash"
genai.configure(api_key=API_KEY)


class SalesPersonaAIService:
    """
    페르소나 기반 AI와의 대화를 관리하는 핵심 서비스 클래스.
    상태를 가지지 않으며(stateless), 각 메서드는 필요한 모든 정보를 인자로 받습니다.
    """

    def __init__(self):
        """
        서비스 초기화. LLM 모델을 설정합니다.
        """
        self.model = genai.GenerativeModel(model_name=MODEL_NAME)
        # 시나리오 설명은 외부에서 관리되거나 필요 시 DB에서 로드할 수 있습니다.
        self.scenarios = {"intro_meeting": "일반적인 제품 상담"}

    def _build_prompt(self, persona: Persona, history: List[ChatMessage], context: str, seller_msg: str) -> str:
        """
        LLM에 전달할 프롬프트를 동적으로 생성합니다.

        Args:
            persona (Persona): 현재 대화의 AI 페르소나 정보.
            history (List[ChatMessage]): 현재 세션의 대화 기록.
            context (str): HybridMemoryManager가 제공하는 관련성 높은 추가 컨텍스트.
            seller_msg (str): 사용자의ล่าสุด 메시지.

        Returns:
            str: 완성된 프롬프트 문자열.
        """
        scenario_desc = self.scenarios.get(persona.goal, "일반적인 제품 상담")
        history_str = "\n".join([f"{msg.role}: {msg.content}" for msg in history])

        # 프롬프트의 각 섹션을 명확하게 구분하여 LLM이 역할을 더 잘 이해하도록 합니다.
        base_prompt = f"""
# 페르소나 프로필
당신은 삼성전자 제품에 관심이 있는 {persona.age_group} {persona.gender} 고객입니다.
- 성격: {persona.personality}
- 기술 이해도: {persona.tech}
- 구매 목적: {persona.goal}
- 제품 사용 목적: {persona.usage}
- 고객 유형: {persona.type}

# 상황 설정
- 시나리오: {scenario_desc}

# 대화 지침
- 당신의 페르소나와 이전 대화 내용을 완벽하게 기억하고, 일관성 있는 응답을 하세요.
- 판매자의 제안이나 설명을 기억하고 응답에 반영하세요.
- 대화가 진행됨에 따라 점진적으로 구체적인 정보를 드러내세요.
- 판매자의 태도에 따라 감정과 신뢰도를 조절하세요.
- 대화 마무리 시에는 반드시 "<대화 종료>"를 포함시키세요.
- 감정 표현은 (웃음), (미소) 와 같이 괄호 안에 한 단어로 간결하게 표현하세요.
- 맞춤법과 띄어쓰기를 정확하게 지켜주세요.

# 대화 기록 (최신순)
{history_str}

# 추가 참조 정보 (관련성 높은 과거 대화)
{context}

# 현재 대화
판매자: {seller_msg}
고객 응답 (위 모든 정보를 바탕으로, 자연스럽게 대화를 이어가세요):
"""
        return base_prompt

    async def stream_response(self, session_id: str, persona: Persona, seller_msg: str) -> Iterable[str]:
        """
        사용자 메시지에 대한 AI의 응답을 스트리밍 방식으로 생성합니다.

        Args:
            session_id (str): 현재 대화 세션 ID.
            persona (Persona): 현재 대화의 AI 페르소나.
            seller_msg (str): 사용자의 메시지.

        Yields:
            str: AI 응답의 각 문장.
        """
        # 1. 사용자 메시지를 대화 기록에 추가
        await chat_history_service.add_message(session_id, "seller", seller_msg)

        # 2. 대화 기록 및 컨텍스트 로드
        chat_session = await chat_history_service.get_session_history(session_id)
        memory_manager = HybridMemoryManager(user_id=chat_session.user_id, session_id=session_id)
        context = memory_manager.get_context(
            current_message=seller_msg,
            recent_history=chat_session.messages[-10:], # 최근 10개 메시지
            summary="" # 요약 기능은 필요 시 추가 구현
        )

        # 3. 프롬프트 생성 및 LLM 호출
        prompt = self._build_prompt(persona, chat_session.messages, context, seller_msg)
        print("[AI] LLM 프롬프트:\n", prompt) # 디버깅용
        try:
            full_response = self.model.generate_content(prompt).text.strip()
            print("[AI] LLM 응답:", repr(full_response)) # 디버깅용
        except Exception as e:
            print(f"[AI] LLM 예외 발생: {e}")
            full_response = f"(응답 생성 실패: {e})"

        # 4. 응답 정리 및 기록 저장
        # "고객:", "AI:" 등 불필요한 접두사 제거
        for prefix in ["고객:", "고객(나):", "AI:", "응답:"]:
            if full_response.startswith(prefix):
                full_response = full_response[len(prefix):].strip()

        ai_message = ChatMessage(role="ai", content=full_response)
        await chat_history_service.add_message(session_id, ai_message.role, ai_message.content)

        # 5. 중요 메시지는 벡터 메모리에 추가
        memory_manager.add_message_to_vector_memory(ai_message)

        # 6. 문장 단위로 스트리밍
        sentences = re.split(r'([.!?])', full_response)
        buffer = ''
        for part in sentences:
            buffer += part
            if part in '.!?':
                yield buffer.strip() + ' '
                buffer = ''
                time.sleep(0.1)
        if buffer.strip():
            yield buffer.strip() + ' '

    async def analyze_conversation(self, session_id: str) -> Tuple[str, float]:
        """
        세션의 전체 대화 내용을 분석하고 평가 리포트를 생성합니다.
        """
        chat_session = await chat_history_service.get_session_history(session_id)
        if not chat_session or not chat_session.messages:
            return "대화 내용이 없어 분석할 수 없습니다.", 0.0

        transcript = "\n".join([f"{msg.role}: {msg.content}" for msg in chat_session.messages])
        analysis_prompt = f"""
# 분석 요청
다음 판매 대화 내용을 아래 평가 기준에 따라 세밀하게 분석하고, 총점을 계산해주세요.

# 대화 내용
{transcript}

# 평가 기준 (총 100점)
1.  **관계 구축 (25점)**: 친근감, 경청, 공감 능력
2.  **제품 지식 (25점)**: 정확성, 이해하기 쉬운 설명
3.  **니즈 파악 (25점)**: 고객 필요 파악, 맞춤 제안
4.  **판매 기법 (25점)**: 자연스러운 진행, 이의 해결, 클로징

# 출력 형식
- **총점**: [점수]/100점
- **주요 키워드**: [대화의 핵심 키워드 5개, 쉼표로 구분]
- **항목별 분석**: [각 항목별 점수와 구체적 근거]
- **종합 평가**: [잘한 점과 개선할 점 요약]
- **조언**: [다음 훈련을 위한 조언 3가지]
"""
        try:
            result = self.model.generate_content(analysis_prompt).text.strip()
            score = self._extract_score(result)
            keywords = self._extract_keywords(result)

            # 분석 결과를 DB에 저장
            analysis_report = AnalysisReport(
                session_id=session_id,
                summary=result,
                keywords=keywords,
                score=score,
                feedback="" # 피드백 필드는 추후 다른 용도로 사용 가능
            )
            await analysis_db_service.add_analysis_report(analysis_report)
            await chat_history_service.update_session_analysis(session_id, analysis_report, score)

            return result, score
        except Exception as e:
            print(f"[Analysis] 예외 발생: {e}")
            return f"분석 중 오류 발생: {e}", 0.0

    def _extract_score(self, text: str) -> float:
        """텍스트에서 점수를 추출합니다."""
        patterns = [r"총점[:\s]*(\d+(?:\.\d+)?)", r"(\d+(?:\.\d+)?)[:/\s]*100"]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    return float(match.group(1))
                except (ValueError, IndexError):
                    continue
        return 0.0

    def _extract_keywords(self, text: str) -> List[str]:
        """텍스트에서 키워드를 추출합니다."""
        match = re.search(r"주요 키워드[:\s]*(.*)", text)
        if match:
            return [k.strip() for k in match.group(1).split(',') if k.strip()]
        return []


# 서비스 인스턴스 생성
sales_persona_ai_service = SalesPersonaAIService()
