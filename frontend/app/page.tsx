"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartChat = () => {
    setIsLoading(true);
    setTimeout(() => {
      const newSessionId = crypto.randomUUID();
      localStorage.setItem("session_id", newSessionId);
      router.push("/persona-confirm");
    }, 1200);
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { staggerChildren: 0.1, delay: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  // 공통 버튼 클래스
  const buttonClass =
    "w-full flex items-center justify-center gap-2 py-4 px-6 rounded-full shadow-xl ring-1 ring-blue-300 transition-all duration-300 hover:scale-105 active:scale-100 text-white bg-gradient-to-r from-blue-600 to-blue-800";

  return (
    <motion.div
      className="max-w-4xl mx-auto px-4 py-16 text-center"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.h1
        className="text-4xl font-extrabold text-blue-900 mb-4"
        variants={itemVariants}
      >
        삼성 페르소나 트레이닝 챗봇
      </motion.h1>

      <motion.p className="text-gray-600 text-lg mb-10" variants={itemVariants}>
        AI 기반 고객 페르소나 대응 훈련 플랫폼입니다.
      </motion.p>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 gap-6"
        variants={containerVariants}
      >
        {/* 채팅 시작 버튼 */}
        <motion.div variants={itemVariants}>
          <button
            onClick={handleStartChat}
            disabled={isLoading}
            className={buttonClass}
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                <span>로딩 중...</span>
              </>
            ) : (
              <>채팅 시작</>
            )}
          </button>
        </motion.div>

        {/* 페르소나 생성 */}
        <motion.div variants={itemVariants}>
          <Link href="/create-persona" className={buttonClass}>
            페르소나 생성
          </Link>
        </motion.div>

        {/* 훈련 통계 */}
        <motion.div variants={itemVariants}>
          <Link href="/stats" className={buttonClass}>
            훈련 통계
          </Link>
        </motion.div>

        {/* 관리자 화면 */}
        <motion.div variants={itemVariants}>
          <Link href="/admin/personas" className={buttonClass}>
            페르소나 기록
          </Link>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
