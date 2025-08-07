"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface SessionDetail {
  id: string;
  startedAt: string;
  score: number;
  persona: {
    type: string;
    personality: string;
    age_group?: string;
    gender?: string;
    goal?: string;
    tech?: string;
    usage?: string;
  };
}

export default function SessionDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : undefined;
  const router = useRouter();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const uid = localStorage.getItem("user_id");
    if (!uid) {
      router.push("/login");
      return;
    }

    if (!id) {
      setError("세션 ID가 잘못되었습니다.");
      return;
    }

    fetch(`/api/stats/${id}`, {
      headers: {
        "x-user-id": uid,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("세션 데이터를 불러오지 못했습니다.");
        return res.json();
      })
      .then((data) => {
        if (data?.id) {
          setSession(data);
        } else {
          setError("세션 정보를 찾을 수 없습니다.");
        }
      })
      .catch((err) => {
        console.error(err);
        setError("세션 정보를 불러오는 중 오류가 발생했습니다.");
      });
  }, [id]);

  if (error) {
    return <div className="text-center py-10 text-red-500">{error}</div>;
  }

  if (!session) {
    return <div className="text-center py-10 text-gray-500">불러오는 중...</div>;
  }

  const { startedAt, score, persona } = session;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <header className="border-b pb-4">
        <h1 className="text-2xl font-bold text-blue-800">세션 상세 보기</h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date(startedAt).toLocaleString()}
        </p>
      </header>

      <section className="bg-white border rounded-lg p-6 shadow space-y-4">
        <div>
          <h2 className="font-semibold text-blue-700 mb-1">🧠 페르소나 정보</h2>
          <ul className="text-sm text-gray-700 space-y-1">
            <li><strong>타입:</strong> {persona.type}</li>
            <li><strong>성격:</strong> {persona.personality}</li>
            {persona.age_group && <li><strong>연령대:</strong> {persona.age_group}</li>}
            {persona.gender && <li><strong>성별:</strong> {persona.gender}</li>}
            {persona.goal && <li><strong>목표:</strong> {persona.goal}</li>}
            {persona.usage && <li><strong>용도:</strong> {persona.usage}</li>}
            {persona.tech && <li><strong>기술 수준:</strong> {persona.tech}</li>}
          </ul>
        </div>

        <div>
          <h2 className="font-semibold text-blue-700 mb-1">📈 세션 점수</h2>
          <p className="text-3xl font-bold text-blue-900">{score}점</p>
        </div>
      </section>
    </div>
  );
}
