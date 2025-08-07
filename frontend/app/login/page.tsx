"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    if (!userId.trim() || !password.trim()) {
      alert("아이디와 비밀번호를 모두 입력하세요.");
      return;
    }

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password }),
      });

      if (!res.ok) {
        const msg = await res.text();
        alert(`로그인 실패: ${msg}`);
        return;
      }

      const data = await res.json();
      if (data.success) {
        localStorage.setItem("user_id", userId);
        router.push("/");
      }
    } catch (err) {
      console.error("로그인 요청 중 오류:", err);
      alert("서버 오류로 로그인에 실패했습니다.");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-blue-50 px-4">
      <div className="bg-white shadow-md rounded-lg p-8 max-w-md w-full space-y-6 border border-blue-100">
        <h1 className="text-2xl font-bold text-center text-blue-900">🔐 로그인</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">사용자 ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full border px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="예: yun123"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="비밀번호 입력"
            />
          </div>

          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
          >
            로그인
          </button>
          <button
  onClick={() => router.push("/signup")}
  className="w-full border border-gray-300 py-2 rounded mt-2 text-gray-600 hover:bg-gray-100"
>
   회원가입
</button>
        </div>
      </div>
    </main>
  );
}
