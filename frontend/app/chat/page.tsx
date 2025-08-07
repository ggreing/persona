"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ChatWindow from "@/components/ChatRoom";

interface Persona {
  age_group: string;
  gender: string;
  personality: string;
  goal: string;
  type: string;
  usage: string;
  tech: string;
}

export default function ChatPage() {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const uid = localStorage.getItem("user_id");
    if (!uid) {
      router.push("/login");
    }
  }, [router]);


  // 세션 ID와 페르소나를 모두 준비한 후, 세션 저장을 한 번만 실행
  useEffect(() => {
    const uid = localStorage.getItem("user_id");
    if (!uid) {
      router.push("/login");
      return;
    }

    // 세션 ID가 없으면 생성
    let newId = localStorage.getItem("session_id");
    if (!newId) {
      newId = crypto.randomUUID();
      localStorage.setItem("session_id", newId);
    }
    setSessionId(newId);

    // 페르소나 준비
    const fromQuery = searchParams.get("personality");
    if (fromQuery) {
      const customPersona: Persona = {
        personality: searchParams.get("personality") || "",
        age_group: searchParams.get("age_group") || "",
        gender: searchParams.get("gender") || "",
        tech: searchParams.get("tech") || "",
        goal: searchParams.get("goal") || "",
        usage: searchParams.get("usage") || "",
        type: searchParams.get("type") || "",
      };
      setPersona(customPersona);
      // 세션 저장
      fetch("/api/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": uid },
        body: JSON.stringify({ score: 0, persona: customPersona }),
      });
    } else {
      fetch("/api/persona", { cache: "no-store" })
        .then((res) => res.json())
        .then((randomPersona) => {
          setPersona(randomPersona);
          // 세션 저장
          fetch("/api/stats", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-user-id": uid },
            body: JSON.stringify({ score: 0, persona: randomPersona }),
          });
        });
    }
    // 의존성: 최초 마운트, searchParams 변경 시만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (!persona || !sessionId) {
    return <div className="text-center text-gray-400 py-10">로딩 중...</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto p-4">
        <ChatWindow initialPersona={persona} sessionId={sessionId} />
      </div>
    </div>
  );
}
