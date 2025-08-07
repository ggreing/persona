"use client";

import { useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMessages = [...messages, { role: "user" as const, content: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    // Stream response from API
    const res = await fetch("/api/chatbot", {
      method: "POST",
      body: JSON.stringify({ messages: newMessages }),
    });

    if (!res.body) {
      setLoading(false);
      return;
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
          <div className="flex-1 overflow-y-auto p-2 space-y-1 text-sm">
            {messages.map((m, i) => (
              <div
                key={i}
                className={m.role === "user" ? "text-right" : "text-left"}
              >
                {m.content}
              </div>
            ))}
            {loading && <div className="text-left">...</div>}
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

