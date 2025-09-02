from qdrant_client import QdrantClient

QDRANT_HOST = "localhost"
QDRANT_PORT = 6333

qdrant_client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)

def get_qdrant_client():
    """
    Dependency for FastAPI to get the Qdrant client instance.
    """
    return qdrant_client
