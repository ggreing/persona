"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  userId: string;
  createdAt: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    if (!userId) {
      router.push("/login");
      return;
    }

    fetch("/api/profile", {
      headers: { "x-user-id": userId },
    })
      .then((res) => {
        if (!res.ok) throw new Error("정보를 불러올 수 없습니다.");
        return res.json();
      })
      .then(setUser)
      .catch(() => {
        alert("프로필 정보를 불러오지 못했습니다.");
      });
  }, []);

  if (!user) {
    return <div className="text-center py-10 text-gray-400">불러오는 중...</div>;
  }

  return (
    <main className="max-w-xl mx-auto px-6 py-12 bg-white rounded-md shadow">
      <h1 className="text-2xl font-bold text-blue-800 mb-6">👤 내 프로필</h1>

      <div className="space-y-4">
        <div>
          <span className="text-gray-500 text-sm">사용자 ID</span>
          <p className="text-lg font-semibold">{user.userId}</p>
        </div>

        <div>
          <span className="text-gray-500 text-sm">가입일</span>
          <p className="text-lg">{new Date(user.createdAt).toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-8">
        <button
          onClick={() => router.push("/settings")}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          프로필 수정
        </button>
      </div>
    </main>
  );
}
