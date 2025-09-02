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
  const { speak } = useTTS();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

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
    const backend = process.env.NEXT_PUBLIC_BACKEND_URL!;
    const res = await fetch(`${backend}/chat/initiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        persona: initialPersona,
      }),
    });
    const data = await res.json();
    setMessages([{ role: "ai", content: data.message }]);

    // 🔹 첫 메시지 저장
    const uid = localStorage.getItem("user_id");
    const personaId = localStorage.getItem("persona_id"); // 필요시
    await fetch("/api/chat/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        user_id: uid || "unknown",
        persona_id: personaId || "unknown",
        role: "ai",
        content: data.message,
        timestamp: new Date().toISOString(),
      }),
    });

    // 페르소나 정보와 함께 TTS 호출
    speak(data.message, initialPersona);
    setChatStarted(true);
    setLoading(false);
  };

  // 메시지 전송 처리
  const handleSend = async (text: string) => {
    if (!text.trim() || !sessionId) return;
    const newMsgs: Msg[] = [...messages, { role: "seller" as "seller", content: text }];
    setMessages(newMsgs);

    const uid = localStorage.getItem("user_id");
    const personaId = localStorage.getItem("persona_id"); // 필요시

    // 🔹 판매자 메시지 저장
    await fetch("/api/chat/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        user_id: uid || "unknown",
        persona_id: personaId || "unknown",
        role: "seller",
        content: text,
        timestamp: new Date().toISOString(),
      }),
    });

    const backend = process.env.NEXT_PUBLIC_BACKEND_URL!;
    const res = await fetch(`${backend}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seller_msg: text, session_id: sessionId }),
    });

    if (!res.body) return;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    setMessages((msgs) => [...msgs, { role: "ai", content: "Typing..." }]);

    let aiMsg = "";
    let hasConversationEnded = false;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('event: conversation_end')) {
          hasConversationEnded = true;
          console.log("🎯 대화종료 이벤트 감지");
        } else {
          aiMsg += trimmed;
        }
      }
      // 실시간으로 메시지 반영
      setMessages((msgs) => {
        const updated = [...msgs];
        const last = updated[updated.length - 1];
        if (last?.role === "ai") {
          updated[updated.length - 1] = { ...last, content: aiMsg };
        }
        return updated;
      });
      // 디버깅: 실시간 메시지 업데이트
      console.log('[DEBUG] setMessages 내부 aiMsg:', aiMsg);
    }

    // 🔹 AI 응답 저장
    await fetch("/api/chat/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sessionId,
        role: "ai",
        content: aiMsg,
      }),
    });

    // 페르소나 정보와 함께 TTS 호출
    speak(aiMsg, initialPersona);

    // 대화종료 감지 시 상태 업데이트
    if (hasConversationEnded) {
      setConversationEnded(true);
      console.log("🎯 대화종료 상태 설정");
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
      <div className="bg-white p-4 rounded shadow min-h-[300px]">
        <MessageList items={messages} />
        <div ref={bottomRef} />
      </div>
      <MessageInput onSend={handleSend} />
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
            speak(testMessage, initialPersona);
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
