from ..db.qdrant import get_qdrant_client
from ..models.mongo_models import Persona
from qdrant_client.http import models
from sentence_transformers import SentenceTransformer
import numpy as np

class PersonaDBService:
    def __init__(self):
        self._client = None
        self.collection_name = "personas"
        self.embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        self.vector_size = self.embedding_model.get_sentence_embedding_dimension()
        self._collection_setup_done = False

    def _get_client(self):
        """지연 초기화를 통해 Qdrant 클라이언트를 가져옵니다."""
        if self._client is None:
            print("Qdrant 클라이언트를 초기화합니다...")
            self._client = get_qdrant_client()
        return self._client

    def _ensure_collection_exists(self):
        """필요 시 단 한번만 컬렉션을 생성합니다."""
        if self._collection_setup_done:
            return

        client = self._get_client()
        try:
            client.get_collection(collection_name=self.collection_name)
            print(f"Qdrant 컬렉션 '{self.collection_name}'이(가) 이미 존재합니다.")
        except Exception:
            print(f"Qdrant 컬렉션 '{self.collection_name}'을(를) 새로 생성합니다.")
            client.recreate_collection(
                collection_name=self.collection_name,
                vectors_config=models.VectorParams(size=self.vector_size, distance=models.Distance.COSINE),
            )
        self._collection_setup_done = True

    def _create_vector(self, persona: Persona):
        text = f"""
        gender: {persona.gender}, age: {persona.age_group}, personality: {persona.personality},
        tech knowledge: {persona.tech}, goal: {persona.goal}, usage: {persona.usage}, type: {persona.type}
        """
        return self.embedding_model.encode(text).tolist()

    async def add_persona(self, persona: Persona):
        self._ensure_collection_exists()
        client = self._get_client()
        vector = self._create_vector(persona)
        client.upsert(
            collection_name=self.collection_name,
            points=[
                models.PointStruct(
                    id=persona.id,
                    vector=vector,
                    payload=persona.dict()
                )
            ],
            wait=True,
        )

    async def get_all_personas(self, limit: int = 100):
        self._ensure_collection_exists()
        client = self._get_client()
        response = client.scroll(
            collection_name=self.collection_name,
            limit=limit,
            with_payload=True,
            with_vectors=False,
        )
        return [Persona(**point.payload) for point in response[0]]

persona_db_service = PersonaDBService()
