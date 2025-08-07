"""HybridMemoryManager – combines short‑term & vector memory."""

import time, uuid
from typing import Dict, List

import google.generativeai as genai
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone, ServerlessSpec

from .config import (
    API_KEY, PINECONE_API_KEY, PINECONE_ENVIRONMENT, MODEL_NAME,
    MAX_RECENT_MESSAGES, VECTOR_DIM, SIMILARITY_THRESHOLD,
)

genai.configure(api_key=API_KEY)

__all__ = ["HybridMemoryManager"]


class HybridMemoryManager:
    """Conversation‑level memory with recent buffer + Pinecone vector DB."""

    def __init__(self, user_id: str):
        self.user_id = user_id
        self.embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        self.recent_memory: List[Dict] = []
        self.summary_memory: str = ""
        self.max_recent_messages = MAX_RECENT_MESSAGES
        self.index = self._init_pinecone()

    # ----- Pinecone helpers ------------------------------------------------
    def _init_pinecone(self):
        try:
            pc = Pinecone(api_key=PINECONE_API_KEY, environment=PINECONE_ENVIRONMENT)
            name = "sales-persona-memory"
            if name not in [idx.name for idx in pc.list_indexes()]:
                pc.create_index(
                    name=name,
                    dimension=VECTOR_DIM,
                    metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region="us-east-1"),
                )
            return pc.Index(name)
        except Exception as e:
            print("Pinecone init failed:", e)
            return None

    # ----- Public API ------------------------------------------------------
    def add_message(self, role: str, content: str):
        msg = {"role": role, "content": content, "timestamp": time.time(), "id": str(uuid.uuid4())}
        self.recent_memory.append(msg)
        if len(self.recent_memory) > self.max_recent_messages:
            self._add_to_summary(self.recent_memory.pop(0))
        if self._is_important(content):
            self._upsert_vector(msg)

    def get_context(self, current_message: str, top_k: int = 3) -> str:
        parts: List[str] = []
        # 1. recent conversation ------------------------------------------------
        if self.recent_memory:
            recent = "\n".join(f"{m['role']}: {m['content']}" for m in self.recent_memory[-5:])
            parts.append(f"[최근 대화]\n{recent}")
        # 2. summary -----------------------------------------------------------
        if self.summary_memory:
            parts.append(f"[이전 대화 요약]\n{self.summary_memory}")
        # 3. vector search -----------------------------------------------------
        if self.index:
            try:
                emb = self.embedding_model.encode(current_message).tolist()
                res = self.index.query(vector=emb, top_k=top_k, include_metadata=True, filter={"user_id": self.user_id})
                relevant = [f"{m.metadata['role']}: {m.metadata['content']}" for m in res.matches if m.score > SIMILARITY_THRESHOLD]
                if relevant:
                    parts.append(f"[관련 이전 정보]\n" + "\n".join(relevant))
            except Exception as e:
                print("Vector search failed:", e)
        return "\n\n".join(parts)

    def clear(self):
        self.recent_memory.clear()
        self.summary_memory = ""

    # ----- Internal helpers -------------------------------------------------
    @staticmethod
    def _is_important(text: str) -> bool:
        keywords = [
            "예산", "가격", "할인", "결정", "구매", "고민", "선호", "경험", "문제", "요구사항", "조건", "제품명", "모델",
            "갤럭시", "비스포크", "QLED", "스마트싱스", "워치", "북", "불만", "만족", "추천", "비교", "성능", "디자인",
        ]
        return any(k in text for k in keywords)

    def _upsert_vector(self, msg: Dict):
        if not self.index:
            return
        try:
            vec = self.embedding_model.encode(msg["content"]).tolist()
            self.index.upsert([
                {
                    "id": f"{self.user_id}_{msg['id']}",
                    "values": vec,
                    "metadata": {
                        "user_id": self.user_id,
                        "role": msg["role"],
                        "content": msg["content"],
                        "timestamp": msg["timestamp"],
                    },
                }
            ])
        except Exception as e:
            print("Vector upsert failed:", e)

    def _add_to_summary(self, msg: Dict):
        snippet = f"{msg['role']}: {msg['content'][:100]}..."
        self.summary_memory = f"{self.summary_memory} | {snippet}" if self.summary_memory else snippet
        if len(self.summary_memory) > 500:
            self._compress_summary()

    def _compress_summary(self):
        try:
            model = genai.GenerativeModel(model_name=MODEL_NAME)
            prompt = f"""
다음 대화 요약을 더 간결하게 압축해주세요. 중요한 정보는 유지하되 200자 이내로 요약해주세요:

{self.summary_memory}
"""
            self.summary_memory = model.generate_content(prompt).text.strip()
        except Exception as e:
            print("Summary compression failed:", e)
