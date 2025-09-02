import time
import uuid
from typing import Dict, List

import google.generativeai as genai
from sentence_transformers import SentenceTransformer
from qdrant_client.http import models

from ..db.qdrant import get_qdrant_client
from ..models.mongo_models import ChatMessage

# These would ideally be in a config file
SIMILARITY_THRESHOLD = 0.75
MODEL_NAME = "gemini-1.5-flash" # Make sure this is a valid model

class HybridMemoryManager:
    """
    Manages conversation memory using a hybrid approach:
    - Short-term buffer (managed by ChatHistoryService)
    - Long-term vector memory (Qdrant)
    - Summarization (using an LLM)
    """

    def __init__(self, user_id: str, session_id: str):
        self.user_id = user_id
        self.session_id = session_id
        self.embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        self.vector_size = self.embedding_model.get_sentence_embedding_dimension()
        self.client = get_qdrant_client()
        self.collection_name = "conversation_memory"
        self._setup_collection()

    def _setup_collection(self):
        try:
            self.client.get_collection(collection_name=self.collection_name)
        except Exception:
            self.client.recreate_collection(
                collection_name=self.collection_name,
                vectors_config=models.VectorParams(size=self.vector_size, distance=models.Distance.COSINE),
            )

    def add_message_to_vector_memory(self, message: ChatMessage):
        """
        Adds a message to the vector store if it's deemed important.
        """
        if self._is_important(message.content):
            self._upsert_vector(message)

    def get_context(self, current_message: str, recent_history: List[ChatMessage], summary: str, top_k: int = 3) -> str:
        """
        Constructs the context string from recent history, summary, and relevant vector search results.
        """
        parts: List[str] = []
        # 1. Recent conversation
        if recent_history:
            recent_text = "\n".join(f"{m.role}: {m.content}" for m in recent_history)
            parts.append(f"[최근 대화]\n{recent_text}")
        # 2. Summary
        if summary:
            parts.append(f"[이전 대화 요약]\n{summary}")
        # 3. Vector search for relevant information
        try:
            query_vector = self.embedding_model.encode(current_message).tolist()
            hits = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_vector,
                limit=top_k,
                query_filter=models.Filter(
                    must=[
                        models.FieldCondition(key="payload.user_id", match=models.MatchValue(value=self.user_id)),
                    ]
                )
            )
            relevant = [f"{hit.payload['role']}: {hit.payload['content']}" for hit in hits if hit.score > SIMILARITY_THRESHOLD]
            if relevant:
                parts.append(f"[관련 이전 정보]\n" + "\n".join(relevant))
        except Exception as e:
            print(f"Vector search failed: {e}")
        return "\n\n".join(parts)

    def compress_summary(self, old_summary: str, text_to_add: str) -> str:
        """
        Compresses the summary using an LLM.
        """
        try:
            model = genai.GenerativeModel(model_name=MODEL_NAME)
            prompt = f"""
다음은 대화의 이전 요약과 최근 대화 내용입니다. 이 둘을 합쳐서 중요한 정보를 유지하되 200자 이내의 간결한 새 요약으로 만들어주세요:

[이전 요약]
{old_summary}

[최근 대화]
{text_to_add}

[새로운 요약]:
"""
            new_summary = model.generate_content(prompt).text.strip()
            return new_summary
        except Exception as e:
            print(f"Summary compression failed: {e}")
            return old_summary # Fallback to the old summary

    # ----- Internal helpers -------------------------------------------------
    @staticmethod
    def _is_important(text: str) -> bool:
        keywords = [
            "예산", "가격", "할인", "결정", "구매", "고민", "선호", "경험", "문제", "요구사항", "조건", "제품명", "모델",
            "갤럭시", "비스포크", "QLED", "스마트싱스", "워치", "북", "불만", "만족", "추천", "비교", "성능", "디자인",
        ]
        return any(k in text for k in keywords)

    def _upsert_vector(self, msg: ChatMessage):
        try:
            vec = self.embedding_model.encode(msg.content).tolist()
            self.client.upsert(
                collection_name=self.collection_name,
                points=[
                    models.PointStruct(
                        id=msg.id,
                        vector=vec,
                        payload={
                            "user_id": self.user_id,
                            "session_id": self.session_id,
                            "role": msg.role,
                            "content": msg.content,
                            "timestamp": msg.timestamp.isoformat(),
                        },
                    )
                ],
                wait=True,
            )
        except Exception as e:
            print(f"Vector upsert failed: {e}")
