"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
} from "recharts";

interface Persona {
  gender: string;
  age_group: string;
  personality: string;
  tech: string;
  goal: string;
  usage: string;
  type: string;
}

interface Session {
  id: string;
  startedAt: string;
  score: number;
  persona: Persona;
}

export default function StatsPage() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const uid = localStorage.getItem("user_id");
    if (!uid) {
      router.push("/login");
      return;
    }

    fetch("/api/stats", {
      headers: { "x-user-id": uid },
    })
      .then((res) => {
        if (!res.ok) throw new Error("서버 응답 오류");
        return res.json();
      })
      .then((data) => {
        console.log("API 응답:", data);

        if (Array.isArray(data)) {
          setSessions(data);
        } else if (Array.isArray(data.sessions)) {
          setSessions(data.sessions);
        } else {
          setError("세션 데이터 형식 오류");
        }
      })
      .catch((err) => {
        console.error("세션 로딩 실패:", err);
        setError("세션 데이터를 불러오는 중 오류가 발생했습니다.");
      });
  }, []);

  if (error) {
    return <div className="p-10 text-red-500 text-center">{error}</div>;
  }

  if (sessions === null) {
    return <div className="p-10 text-gray-500 text-center">불러오는 중...</div>;
  }

  if (sessions.length === 0) {
    return <div className="p-10 text-gray-500 text-center">세션이 없습니다.</div>;
  }

  // 통계 계산
  const totalScore = sessions.reduce((sum, s) => sum + s.score, 0);
  const avgScore = (totalScore / sessions.length).toFixed(1);

  const countByField = (field: keyof Persona) => {
    const count: Record<string, number> = {};
    sessions.forEach(({ persona }) => {
      const key = persona[field];
      count[key] = (count[key] || 0) + 1;
    });
    return Object.entries(count).map(([name, value]) => ({ name, value }));
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
      <h1 className="text-3xl font-bold text-blue-800">📊 통계 요약</h1>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow text-center">
          <div className="text-sm text-gray-500">총 세션 수</div>
          <div className="text-xl font-bold">{sessions.length}</div>
        </div>
        <div className="bg-white p-4 rounded shadow text-center">
          <div className="text-sm text-gray-500">평균 점수</div>
          <div className="text-xl font-bold">{avgScore}점</div>
        </div>
      </div>

      {/* 분포 시각화 */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold text-blue-700 mb-2">성별 분포</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={countByField("gender")} dataKey="value" nameKey="name" outerRadius={80} label>
                {countByField("gender").map((_, i) => (
                  <Cell key={i} fill={["#3B82F6", "#F59E0B", "#EF4444"][i % 3]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold text-blue-700 mb-2">연령대 분포</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={countByField("age_group")}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#6366F1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 세션 리스트 */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-blue-700">🗂 최근 세션 목록</h2>
        <ul className="space-y-2">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="p-4 border rounded hover:bg-gray-50 cursor-pointer"
              onClick={() => router.push(`/stats/${s.id}`)}
            >
              <div className="flex justify-between">
                <div>
                  <div className="font-semibold">{s.persona.type} / {s.persona.personality}</div>
                  <div className="text-sm text-gray-500">{new Date(s.startedAt).toLocaleString()}</div>
                </div>
                <div className="text-blue-800 font-bold">{s.score}점</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
