"use client";
import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MessageInput({ onSend }: { onSend: (txt: string) => void }) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 자동 높이 조정
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto"; // 초기화
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [text]);

  return (
    <div className="border-t p-3 flex items-end gap-2">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
        placeholder="메시지를 입력하세요..."
        className="flex-1 resize-none rounded-xl border border-gray-300 p-3 text-base focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed max-h-40 overflow-auto"
        rows={1}
      />
      <Button
        onClick={handleSend}
        className="bg-primary hover:bg-primary/90 text-white flex gap-1 items-center px-4 py-2 rounded-xl"
      >
        <Send size={16} />
        전송
      </Button>
    </div>
  );
}
