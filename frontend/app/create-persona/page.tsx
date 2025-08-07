"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreatePersonaPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    personality: "",
    age_group: "30대",
    gender: "여성",
    tech: "중간",
    goal: "",
    type: "",
    usage: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/persona/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const sessionId = crypto.randomUUID();
    localStorage.setItem("session_id", sessionId);

    const query = new URLSearchParams(form).toString();
    router.push(`/chat?${query}`);
  };

  return (
    <div className="max-w-lg mx-auto p-8 bg-white rounded-xl shadow-md mt-10">
      <h1 className="text-3xl font-bold text-center text-blue-800 mb-8">
        사용자 정의 페르소나 생성
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Input Fields */}
        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">성격</label>
          <input
            name="personality"
            required
            placeholder="예: 외향적이고 활발한 성격"
            className="w-full px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={form.personality}
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">연령대</label>
          <select
            name="age_group"
            value={form.age_group}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option>10대</option>
            <option>20대</option>
            <option>30대</option>
            <option>40대</option>
            <option>50대 이상</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">성별</label>
          <select
            name="gender"
            value={form.gender}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option>여성</option>
            <option>남성</option>
            <option>기타</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">기술 친숙도</label>
          <select
            name="tech"
            value={form.tech}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option>낮음</option>
            <option>중간</option>
            <option>높음</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">고객 목표</label>
          <input
            name="goal"
            required
            placeholder="예: 업무 효율 향상"
            className="w-full px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={form.goal}
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">고객 유형</label>
          <input
            name="type"
            required
            placeholder="예: 마케팅 담당자"
            className="w-full px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={form.type}
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">사용 목적</label>
          <input
            name="usage"
            required
            placeholder="예: 내부 교육 자료 제작"
            className="w-full px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={form.usage}
            onChange={handleChange}
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-700 hover:bg-blue-800 text-white rounded-md py-3 font-semibold transition"
        >
          ✅ 저장하고 바로 시작하기
        </button>
      </form>
    </div>
  );
}
