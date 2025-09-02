from ..db.qdrant import get_qdrant_client
from ..models.mongo_models import AnalysisReport
from qdrant_client.http import models
from sentence_transformers import SentenceTransformer
import numpy as np

class AnalysisDBService:
    def __init__(self):
        self.client = get_qdrant_client()
        self.collection_name = "analysis_reports"
        self.embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        self.vector_size = self.embedding_model.get_sentence_embedding_dimension()
        self.setup_collection()

    def setup_collection(self):
        try:
            self.client.get_collection(collection_name=self.collection_name)
        except Exception:
            self.client.recreate_collection(
                collection_name=self.collection_name,
                vectors_config=models.VectorParams(size=self.vector_size, distance=models.Distance.COSINE),
            )

    def _create_vector(self, report: AnalysisReport):
        text_to_embed = f"Summary: {report.summary}\nKeywords: {', '.join(report.keywords)}"
        return self.embedding_model.encode(text_to_embed).tolist()

    async def add_analysis_report(self, report: AnalysisReport):
        vector = self._create_vector(report)
        self.client.upsert(
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
        vector = self.embedding_model.encode(query).tolist()
        hits = self.client.search(
            collection_name=self.collection_name,
            query_vector=vector,
            limit=top_k,
            with_payload=True
        )
        return [AnalysisReport(**hit.payload) for hit in hits]

analysis_db_service = AnalysisDBService()
