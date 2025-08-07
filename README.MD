# =========================
# 빌드 & 실행
# =========================
# 백엔드 (가상환경)
pip install -e backend/sales_persona_backend fastapi uvicorn "python-dotenv[cli]"
uvicorn backend.fastapi_app:app --reload --port 8000

# 프런트
cd frontend
npm install
npm run dev

# =========================
# 끝. 필요 시 추가 기능(로그인, 멀티 세션 목록, i18n 등)을 이어서 확장할 수 있습니다.
