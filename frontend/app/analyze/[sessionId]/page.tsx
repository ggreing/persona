"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import useTTS from "@/hooks/useTTS";

export default function AnalyzePage() {
  const { sessionId } = useParams() as { sessionId: string };
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [persona, setPersona] = useState<any>(null);
  const { speak } = useTTS();
  const [ttsLoading, setTtsLoading] = useState(false);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        });
        if (!res.ok) {
          const err = await res.text();
          throw new Error(err);
        }
        const txt = await res.text();
        setAnalysis(txt);
        
        // 페르소나 정보도 가져오기 (세션에서)
        try {
          const personaRes = await fetch(`/api/stats/${sessionId}`);
          if (personaRes.ok) {
            const personaData = await personaRes.json();
            setPersona(personaData.persona);
          }
        } catch (e) {
          console.log("페르소나 정보 가져오기 실패:", e);
        }
      } catch (err: any) {
        setError(err.message || "분석 요청 실패");
      }
    };
    fetchAnalysis();
  }, [sessionId]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-blue-800 mb-1">
          🧠 대화 성과 분석 결과
        </h1>
        <p className="text-sm text-gray-500">
          세션 ID: <span className="font-mono">{sessionId}</span>
        </p>
        {persona && (
          <p className="text-sm text-gray-500">
            페르소나: {persona.gender} ({persona.personality})
          </p>
        )}
      </header>

      {error && (
        <div className="bg-red-100 border border-red-300 text-red-700 p-4 rounded">
          ❌ 오류: {error}
        </div>
      )}

      {!analysis && !error && (
        <div className="text-gray-600 text-center mt-10">
          ⏳ 분석 결과를 불러오는 중입니다...
        </div>
      )}

      {analysis && (
        <div className="space-y-8">
          <button
            className="mb-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={async () => {
              setTtsLoading(true);
              await speak(analysis, persona);
              setTtsLoading(false);
            }}
            disabled={ttsLoading}
          >
            {ttsLoading ? "음성 변환 중..." : "🔊 분석 결과 음성으로 듣기"}
          </button>
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h2 className="text-2xl font-bold text-blue-700 mt-6 mb-2">
                  {children}
                </h2>
              ),
              h2: ({ children }) => (
                <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-1 border-b pb-1 border-gray-200">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="text-gray-800 leading-relaxed mb-3">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {children}
                </ul>
              ),
              li: ({ children }) => <li className="ml-4">{children}</li>,
              strong: ({ children }) => (
                <strong className="text-blue-900 font-semibold">{children}</strong>
              ),
              code: ({ children }) => (
                <span className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-purple-700">
                  {children}
                </span>
              ),
              blockquote: ({ children }) => (
                <div className="bg-blue-50 border-l-4 border-blue-300 px-4 py-3 text-blue-900 italic rounded">
                  {children}
                </div>
              ),
            }}
          >
            {preprocessAnalysis(analysis)}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}

/**
 * 분석 텍스트에서 점수 부분과 개선 제안 부분을 감싸는 마크다운 처리
 */
function preprocessAnalysis(text: string): string {
  // 점수 강조: "점수: 85점" => 🔵 배지 느낌 강조 (h2)
  const scored = text.replace(/(점수\s*[:：]\s*\d+점)/g, (_, score) => `### 🎯 ${score}`);

  // 개선 제안 헤더 → h1으로 분리
  const improved = scored.replace(/(개선\s*방향|개선\s*제안)/gi, "\n\n# 💡 $1");

  return improved;
}
