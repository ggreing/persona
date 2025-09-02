from minio import Minio
from minio.error import S3Error
from io import BytesIO

# TODO: .env 또는 config 파일로 이동
MINIO_API_HOST = "localhost:9000"
MINIO_ACCESS_KEY = "minioadmin"
MINIO_SECRET_KEY = "minioadmin"

class StorageService:
    """
    MinIO 오브젝트 스토리지와의 상호작용을 관리하는 서비스.
    파일 업로드, 다운로드, 버킷 관리 등을 담당합니다.
    """
    def __init__(self):
        try:
            self.client = Minio(
                MINIO_API_HOST,
                access_key=MINIO_ACCESS_KEY,
                secret_key=MINIO_SECRET_KEY,
                secure=False  # 로컬 환경에서는 False로 설정
            )
            print("MinIO 클라이언트가 성공적으로 초기화되었습니다.")
        except Exception as e:
            self.client = None
            print(f"MinIO 클라이언트 초기화 실패: {e}")

    def _ensure_bucket_exists(self, bucket_name: str):
        """
        지정된 이름의 버킷이 없으면 새로 생성합니다.
        """
        if not self.client:
            raise ConnectionError("MinIO 클라이언트가 초기화되지 않았습니다.")

        found = self.client.bucket_exists(bucket_name)
        if not found:
            self.client.make_bucket(bucket_name)
            print(f"버킷 '{bucket_name}'이(가) 생성되었습니다.")
        else:
            print(f"버킷 '{bucket_name}'이(가) 이미 존재합니다.")

    def upload_file(self, bucket_name: str, object_name: str, data: bytes, content_type: str = 'application/octet-stream') -> str:
        """
        바이너리 데이터를 MinIO 버킷에 업로드합니다.

        Args:
            bucket_name (str): 업로드할 버킷 이름.
            object_name (str): 버킷 내에 저장될 객체 이름 (파일 경로 포함).
            data (bytes): 업로드할 파일의 바이너리 데이터.
            content_type (str): 파일의 MIME 타입.

        Returns:
            str: 업로드된 객체의 ETag (해시값).
        """
        self._ensure_bucket_exists(bucket_name)
        data_stream = BytesIO(data)
        try:
            result = self.client.put_object(
                bucket_name,
                object_name,
                data_stream,
                length=len(data),
                content_type=content_type
            )
            print(f"'{object_name}'이(가) '{bucket_name}' 버킷에 성공적으로 업로드되었습니다.")
            return result.etag
        except S3Error as e:
            print(f"파일 업로드 중 S3 오류 발생: {e}")
            raise

    def download_file(self, bucket_name: str, object_name: str) -> bytes:
        """
        MinIO 버킷에서 파일을 다운로드합니다.

        Args:
            bucket_name (str): 다운로드할 버킷 이름.
            object_name (str): 다운로드할 객체 이름.

        Returns:
            bytes: 다운로드된 파일의 바이너리 데이터.
        """
        if not self.client:
            raise ConnectionError("MinIO 클라이언트가 초기화되지 않았습니다.")
        try:
            response = self.client.get_object(bucket_name, object_name)
            return response.read()
        except S3Error as e:
            print(f"파일 다운로드 중 S3 오류 발생: {e}")
            raise
        finally:
            if 'response' in locals() and response:
                response.close()
                response.release_conn()

# 서비스 인스턴스 생성
storage_service = StorageService()
