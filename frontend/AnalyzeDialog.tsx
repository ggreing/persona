"use client";
import { useState } from "react";

export default function AnalyzeDialog({ sessionId }: { sessionId: string }) {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    setLoading(true);
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    });
    const text = await res.text();
    setResult(text);
    setLoading(false);
  };

  return (
    <div className="mt-4">
      <button onClick={analyze} className="text-sm text-primary underline disabled:text-gray-400" disabled={loading}>
        🔍 대화 성과 분석하기
      </button>
      {loading && <p className="text-sm text-gray-500">분석 중...</p>}
      {result && <pre className="whitespace-pre-wrap bg-gray-50 border rounded p-2 mt-2 text-sm max-h-96 overflow-auto">{result}</pre>}
    </div>
  );
}