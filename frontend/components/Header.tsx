"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Header() {
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const savedId = localStorage.getItem("user_id");
    if (savedId) setUserId(savedId);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user_id");
    setUserId(null);
    router.push("/login");
  };

  const handleLogin = () => {
    router.push("/login");
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 h-14 
        bg-white/80 backdrop-blur-md border-b border-blue-100 shadow-sm 
        flex items-center justify-between px-6 z-50"
    >
      <Link href="/" className="text-lg font-bold text-blue-900 hover:no-underline">
        📘 Persona AI
      </Link>

      <div className="flex items-center gap-4 text-sm text-blue-900">
        {userId ? (
          <>
            <span className="font-semibold">👤 {userId}</span>
            <Link href="/profile" className="hover:underline">
              프로필
            </Link>
            <Link href="/settings" className="hover:underline">
              설정
            </Link>
            <button
              onClick={handleLogout}
              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
            >
              로그아웃
            </button>
          </>
        ) : (
          <>
            <Link href="/profile" className="hover:underline">
              프로필
            </Link>

            <button
              onClick={handleLogin}
              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
            >
              로그인
            </button>
            <Link
              href="/signup"
              className="px-3 py-1 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition"
            >
              회원가입
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
