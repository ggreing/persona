"use client";

import { useEffect, useRef, useState } from "react";
import MessageList from "@/components/MessageList";
import MessageInput from "@/components/MessageInput";
import Link from "next/link";
import useTTS from "@/hooks/useTTS";
import { useRouter } from "next/navigation";

interface Msg {
  role: "seller" | "ai";
  content: string;
}

interface Persona {
  age_group: string;
  gender: string;
  personality: string;
  tech: string;
  goal: string;
  usage: string;
  type: string;
}

export default function ChatWindow({ initialPersona }: { initialPersona: Persona }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  // 디버깅: messages 상태 변화 추적
  useEffect(() => {
    console.log('[DEBUG] messages 상태 변경:', messages);
  }, [messages]);
  const [sessionId, setSessionId] = useState<string>("");
  const [chatStarted, setChatStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [conversationEnded, setConversationEnded] = useState(false);
  const { speakOnce, isPlaying, error: ttsError } = useTTS();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  // TTS 파라미터 상태
  const [ttsRate, setTtsRate] = useState(1.1);
  const [ttsPitch, setTtsPitch] = useState(0);
  const [ttsModel, setTtsModel] = useState("GoogleTTS");

  // 세션 ID 초기화
  useEffect(() => {
    const saved = localStorage.getItem("session_id");
    if (saved) {
      setSessionId(saved);
    } else {
      const newId = crypto.randomUUID();
      localStorage.setItem("session_id", newId);
      setSessionId(newId);
    }
  }, []);

  // 대화종료 시 자동 이동
  useEffect(() => {
    if (conversationEnded) {
      const timer = setTimeout(() => {
        router.push(`/analyze/${sessionId}`);
      }, 2000); // 2초 후 분석 페이지로 이동
      
      return () => clearTimeout(timer);
    }
  }, [conversationEnded, sessionId, router]);

  // 채팅 시작(대화 첫 인사)
  const startChat = async () => {
    if (!initialPersona || !sessionId) return;
    setLoading(true);
    const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    // 새로운 백엔드 API 엔드포인트로 수정
    const res = await fetch(`${backend}/api/chat/initiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: localStorage.getItem("user_id") || "unknown",
        persona_id: localStorage.getItem("persona_id") || "unknown",
      }),
    });
    const data = await res.json();
    // 백엔드에서 대화 기록을 관리하므로, 프론트엔드에서는 첫 메시지만 표시
    setMessages([{ role: "ai", content: data.message }]);

    // 페르소나 정보와 함께 TTS 호출
    speakOnce(data.message, { speaking_rate: ttsRate, pitch: ttsPitch, model: ttsModel });
    setChatStarted(true);
    setLoading(false);
  };

  // 메시지 전송 처리
  const handleSend = async (text: string) => {
    if (!text.trim() || !sessionId) return;
    // 사용자 메시지를 즉시 UI에 반영
    const newMsgs: Msg[] = [...messages, { role: "seller", content: text }];
    setMessages(newMsgs);

    const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    // 새로운 SSE 스트리밍 엔드포인트로 수정
    const res = await fetch(`${backend}/api/chat/${sessionId}/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seller_msg: text }),
    });

    if (!res.body) return;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    // AI 응답을 표시하기 위해 대기 상태 추가
    setMessages((msgs) => [...msgs, { role: "ai", content: "" }]);

    let aiMsgBuffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });

      const parts = chunk.split("\n\n");
      for (const part of parts) {
        if (part.startsWith("data: ")) {
            aiMsgBuffer += part.substring(6);
            // 실시간으로 AI 메시지 업데이트
            setMessages((msgs) => {
                const updated = [...msgs];
                if (updated.length > 0 && updated[updated.length - 1].role === "ai") {
                    updated[updated.length - 1].content = aiMsgBuffer;
                }
                return updated;
            });
        }
      }
    }

    // 최종 AI 메시지로 TTS 호출
    speakOnce(aiMsgBuffer, { speaking_rate: ttsRate, pitch: ttsPitch, model: ttsModel });

    // 대화 종료 감지
    if (aiMsgBuffer.includes("<대화 종료>")) {
      setConversationEnded(true);
      console.log("🎯 대화종료 감지");
    }
  };

  // 스크롤 아래로 이동
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 채팅 시작 전 - 페르소나 확인
  if (!chatStarted) {
    return (
      <div className="max-w-2xl mx-auto py-10 space-y-4 text-center">
        <h2 className="text-xl font-bold text-blue-800">고객 페르소나 확정</h2>
        <div className="bg-gray-50 rounded p-6 text-left shadow inline-block">
          <div>🧑‍💼 <b>{initialPersona.age_group} {initialPersona.gender}</b> ({initialPersona.type})</div>
          <div>성격: {initialPersona.personality}</div>
          <div>기술 수준: {initialPersona.tech}</div>
          <div>구매 목적: {initialPersona.goal}</div>
          <div>사용 목적: {initialPersona.usage}</div>
        </div>
        <button
          disabled={loading}
          className="mt-6 bg-blue-600 text-white px-6 py-3 rounded font-bold hover:bg-blue-800 text-lg"
          onClick={startChat}
        >
          {loading ? "고객 준비 중..." : "이 페르소나로 대화 시작"}
        </button>
      </div>
    );
  }

  // 대화종료 알림
  if (conversationEnded) {
    return (
      <div className="max-w-2xl mx-auto py-10 space-y-4 text-center">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-green-800 mb-2">🎯 대화 완료!</h2>
          <p className="text-green-700 mb-4">
            AI가 대화종료를 감지했습니다. 잠시 후 분석 결과 페이지로 이동합니다...
          </p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        </div>
      </div>
    );
  }

  // 채팅 화면
  // 디버깅: MessageList 렌더 직전
  console.log('[DEBUG] MessageList 렌더 items:', messages);
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-blue-800 mb-4">💬 세일즈 AI 상담</h1>

      {/* TTS 제어 UI */}
      <div className="bg-gray-100 p-4 rounded-lg mb-4 space-y-4">
          <h3 className="font-bold text-gray-700">🔊 TTS 설정</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                  <label htmlFor="tts-model" className="block text-sm font-medium text-gray-600">TTS 모델</label>
                  <select id="tts-model" value={ttsModel} onChange={e => setTtsModel(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                      <option>GoogleTTS</option>
                      {/* 다른 모델 추가 가능 */}
                  </select>
              </div>
              <div>
                  <label htmlFor="tts-rate" className="block text-sm font-medium text-gray-600">재생 속도: {ttsRate.toFixed(1)}</label>
                  <input type="range" id="tts-rate" min="0.5" max="2.0" step="0.1" value={ttsRate} onChange={e => setTtsRate(parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"/>
              </div>
              <div>
                  <label htmlFor="tts-pitch" className="block text-sm font-medium text-gray-600">음성 피치: {ttsPitch.toFixed(1)}</label>
                  <input type="range" id="tts-pitch" min="-5" max="5" step="0.5" value={ttsPitch} onChange={e => setTtsPitch(parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"/>
              </div>
          </div>
          {ttsError && <div className="text-red-500 text-sm mt-2">TTS 오류: {ttsError}</div>}
      </div>

      <div className="bg-white p-4 rounded shadow min-h-[300px]">
        <MessageList items={messages} />
        <div ref={bottomRef} />
      </div>
      <MessageInput onSend={handleSend} disabled={isPlaying} />
      <div className="mt-4 flex justify-between items-center">
        {messages.length > 6 && (
          <Link href={`/analyze/${sessionId}`}>
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">
              대화 분석 보기 →
            </button>
          </Link>
        )}
        
        {/* 테스트용 대화종료 버튼 */}
        <button
          onClick={() => {
            const testMessage = "네, 그럼 그렇게 하겠습니다. <대화종료> (차분하게) 좋은 상담이었습니다.";
            setMessages(prev => [...prev, { role: "ai", content: testMessage }]);
            speakOnce(testMessage, { speaking_rate: ttsRate, pitch: ttsPitch, model: ttsModel });
            setTimeout(() => setConversationEnded(true), 1000);
          }}
          className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 text-sm"
        >
          🧪 대화종료 테스트
        </button>
      </div>
    </div>
  );
}
