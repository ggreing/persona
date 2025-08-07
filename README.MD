# Persona AI Web

AI 기반 세일즈/일상 챗봇 및 음성(STT/TTS) 통합 웹 서비스

## 주요 기능

- **세일즈 페르소나 챗봇**: 세일즈 시나리오와 페르소나 기반 대화, 세션별 대화 기록 및 분석
- **Simple 챗봇**: 일반 대화용 챗봇, 세션별 대화 기록 기억
- **음성 합성(TTS)**: 감정/페르소나 기반 음성 합성 (Google Cloud TTS)
- **음성 인식(STT)**: Google Cloud Speech-to-Text 연동, 프론트엔드에서 음성 녹음 및 텍스트 변환
- **실시간 스트리밍**: SSE 기반 실시간 답변 스트리밍
- **Next.js 기반 프론트엔드**: React UI, 채팅/음성/분석 등 다양한 페이지 제공

## 폴더 구조

```
backend/
  fastapi_app.py         # FastAPI 메인 엔트리포인트
  requirements.txt       # 백엔드 의존성
  sales_persona_backend/ # AI, 분석, 메모리, 라우터 등 핵심 로직
frontend/
  components/            # ChatWidget, ChatRoom 등 UI 컴포넌트
  app/                   # Next.js app router, API 프록시
  hooks/, lib/           # 커스텀 훅, API 유틸
  package.json           # 프론트엔드 의존성
prisma/                  # DB 스키마 및 마이그레이션
```

## 설치 및 실행 방법

### 1. 백엔드(FastAPI)

1. Python 3.11+ 설치
2. Google Cloud TTS/STT 서비스 계정 키 준비 (환경변수 GOOGLE_SERVICE_ACCOUNT_JSON)
3. 의존성 설치
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
4. 서버 실행
   ```bash
   uvicorn fastapi_app:app --reload
   ```

### 2. 프론트엔드(Next.js)

1. Node.js 18+ 설치
2. 의존성 설치
   ```bash
   cd frontend
   npm install
   ```
3. 개발 서버 실행
   ```bash
   npm run dev
   ```

### 3. 환경 변수
- 백엔드: `.env` 파일에 Google Cloud 인증 정보 등 설정
- 프론트엔드: `BACKEND_URL` 환경변수로 백엔드 주소 지정 가능

## 주요 API

### 챗봇
- `/chatbot` (POST):
  - `{ message, session_id }` → SSE 스트리밍 응답 (simple 챗봇, 세션별 대화 기억)
- `/chat` (POST):
  - `{ session_id, seller_msg }` → 세일즈 페르소나 챗봇

### 음성
- `/tts` (POST): 텍스트 → 음성(MP3)
- `/tts/stream` (POST): 실시간 음성 합성
- `/api/stt` (프론트엔드): 음성 파일 업로드 → 텍스트 변환

## 세션 기반 simple 챗봇 사용법
- 프론트엔드에서 자동으로 session_id를 생성/유지하여 백엔드로 전달
- 같은 브라우저/탭에서 대화 시, 이전 대화 맥락을 기억함

## 개발 참고
- FastAPI + Next.js 구조, SSE 스트리밍, Google Cloud 연동
- 프론트엔드에서 messages 배열만 넘기면 route.ts가 마지막 user 메시지를 추출해 전달
- simple 챗봇도 세션별로 대화 기록을 기억함

## 기여 및 문의
- Pull Request/Issue 환영
- 문의: ggreing (owner)

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
