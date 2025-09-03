from ..db.qdrant import get_qdrant_client
from ..models.mongo_models import AnalysisReport
from qdrant_client.http import models
from sentence_transformers import SentenceTransformer
import numpy as np

class AnalysisDBService:
    def __init__(self):
        self._client = None
        self.collection_name = "analysis_reports"
        self.embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        self.vector_size = self.embedding_model.get_sentence_embedding_dimension()
        self._collection_setup_done = False

    def _get_client(self):
        """지연 초기화를 통해 Qdrant 클라이언트를 가져옵니다."""
        if self._client is None:
            print("Qdrant 클라이언트를 초기화합니다 (AnalysisDB).")
            self._client = get_qdrant_client()
        return self._client

    def _ensure_collection_exists(self):
        """필요 시 단 한번만 컬렉션을 생성합니다."""
        if self._collection_setup_done:
            return

        client = self._get_client()
        try:
            client.get_collection(collection_name=self.collection_name)
        except Exception:
            client.recreate_collection(
                collection_name=self.collection_name,
                vectors_config=models.VectorParams(size=self.vector_size, distance=models.Distance.COSINE),
            )
        self._collection_setup_done = True

    def _create_vector(self, report: AnalysisReport):
        text_to_embed = f"Summary: {report.summary}\nKeywords: {', '.join(report.keywords)}"
        return self.embedding_model.encode(text_to_embed).tolist()

    async def add_analysis_report(self, report: AnalysisReport):
        self._ensure_collection_exists()
        client = self._get_client()
        vector = self._create_vector(report)
        client.upsert(
            collection_name=self.collection_name,
            points=[
                models.PointStruct(
                    id=report.id,
                    vector=vector,
                    payload=report.dict()
                )
            ],
            wait=True,
        )

    async def search_reports(self, query: str, top_k: int = 5):
        self._ensure_collection_exists()
        client = self._get_client()
        vector = self.embedding_model.encode(query).tolist()
        hits = client.search(
            collection_name=self.collection_name,
            query_vector=vector,
            limit=top_k,
            with_payload=True
        )
        return [AnalysisReport(**hit.payload) for hit in hits]

analysis_db_service = AnalysisDBService()
