// components/PersonaForm.tsx
"use client";
import { useState } from "react";

export default function PersonaForm() {
  const [form, setForm] = useState({
    personality: "",
    age_group: "",
    gender: "",
    tech: "",
    goal: "",
    type: "",
    usage: ""
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/persona/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitted(true);
  };

  return (
    <div className="bg-white shadow-md rounded-xl p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-blue-800 mb-4">🧠 사용자 정의 페르소나 생성</h2>
      {submitted ? (
        <p className="text-green-600 font-medium">✅ 페르소나가 성공적으로 저장되었습니다!</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea name="personality" onChange={handleChange} value={form.personality} rows={3}
            className="w-full border rounded px-3 py-2 text-sm" placeholder="성격 묘사" required />
          
          <input name="age_group" onChange={handleChange} value={form.age_group}
            className="w-full border rounded px-3 py-2 text-sm" placeholder="연령대 (예: 30대)" required />

          <select name="gender" onChange={handleChange} value={form.gender}
            className="w-full border rounded px-3 py-2 text-sm" required>
            <option value="">성별 선택</option>
            <option value="남성">남성</option>
            <option value="여성">여성</option>
            <option value="젠더리스">젠더리스</option>
          </select>

          <input name="tech" onChange={handleChange} value={form.tech}
            className="w-full border rounded px-3 py-2 text-sm" placeholder="기술 수준 (예: 중급)" required />

          <input name="goal" onChange={handleChange} value={form.goal}
            className="w-full border rounded px-3 py-2 text-sm" placeholder="구매 목표" required />

          <input name="type" onChange={handleChange} value={form.type}
            className="w-full border rounded px-3 py-2 text-sm" placeholder="고객 유형" required />

          <input name="usage" onChange={handleChange} value={form.usage}
            className="w-full border rounded px-3 py-2 text-sm" placeholder="사용 목적" required />

          <button type="submit" className="bg-blue-700 text-white text-sm py-2 px-4 rounded hover:bg-blue-800">
            저장하기
          </button>
        </form>
      )}
    </div>
  );
}
