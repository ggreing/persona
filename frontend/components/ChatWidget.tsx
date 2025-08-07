"use client";

import { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
// 세션ID를 브라우저 세션에 저장/재사용
function getOrCreateSessionId() {
  if (typeof window === 'undefined') return '';
  let sessionId = window.sessionStorage.getItem('simple_chatbot_session_id');
  if (!sessionId) {
    sessionId = uuidv4();
    window.sessionStorage.setItem('simple_chatbot_session_id', sessionId);
  }
  return sessionId;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);


  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMessages = [...messages, { role: "user" as const, content: input }];
    setMessages(newMessages);
    setInput("");
    setError(null);
    setLoading(true);

    // Stream response from API
    try {
      const sessionId = getOrCreateSessionId();
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, session_id: sessionId }),
      });

      if (!res.body || !res.ok) {
        throw new Error("응답을 받지 못했습니다");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let botText = "";

      setMessages((msgs) => [...msgs, { role: "assistant", content: "" }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        botText += decoder.decode(value, { stream: true });
        setMessages((msgs) => {
          const updated = [...msgs];
          updated[updated.length - 1] = { role: "assistant", content: botText };
          return updated;
        });
      }
    } catch (e: any) {
      setError(e.message);
    }

    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div className="w-80 h-96 bg-white rounded-lg shadow-lg flex flex-col mb-2">
          <div className="flex-1 overflow-y-auto p-2 space-y-2 text-sm">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-lg ${
                    m.role === "user"
                      ? "bg-blue-500 text-white rounded-br-none"
                      : "bg-gray-200 text-gray-900 rounded-bl-none"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-200 text-gray-900 rounded-lg rounded-bl-none px-3 py-2 max-w-[75%]">
                  ...
                </div>
              </div>
            )}
            {error && (
              <div className="text-xs text-red-500">{error}</div>
            )}
            {/* 스크롤 자동 이동용 더미 */}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSubmit} className="p-2 border-t">
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="메시지를 입력하세요"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </form>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg"
      >
        🤖
      </button>
    </div>
  );
}

