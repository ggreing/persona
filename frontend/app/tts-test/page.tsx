"use client";
import { useState } from "react";
import useTTS from "@/hooks/useTTS";

export default function TTSTestPage() {
  const [text, setText] = useState("안녕하세요! (따뜻하게) TTS 테스트입니다. (웃으며) 감정 표현이 포함된 음성을 들어보세요.");
  const [status, setStatus] = useState<string>("");
  const { speak } = useTTS();

  const testTTS = async () => {
    setStatus("🔊 TTS 테스트 시작...");
    try {
      await speak(text);
      setStatus("✅ TTS 재생 완료");
    } catch (error) {
      setStatus(`❌ TTS 오류: ${error}`);
    }
  };

  const testBackendStatus = async () => {
    setStatus("🔍 백엔드 TTS 상태 확인 중...");
    try {
      const backend = process.env.NEXT_PUBLIC_BACKEND_URL!;
      const res = await fetch(`${backend}/tts/status`);
      const data = await res.json();
      setStatus(`📊 백엔드 상태: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      setStatus(`❌ 백엔드 상태 확인 오류: ${error}`);
    }
  };

  const testEmotionExamples = async () => {
    const examples = [
      "안녕하세요! (따뜻하게) 반갑습니다.",
      "정말 좋은 제품이네요! (열정적으로) 꼭 구매해보세요.",
      "고민이 있으시군요. (공감하며) 말씀해보세요.",
      "정말 대단하세요! (칭찬하며) 잘 하셨습니다.",
      "괜찮아요. (위로하며) 힘내세요.",
      "어떤 제품을 찾고 계신가요? (질문하듯)",
      "이 제품의 특징을 (설명하며) 말씀드리겠습니다.",
      "확실히 좋은 선택이에요! (확신하며)",
      "조용히 (차분하게) 말씀해주세요.",
      "정말 활발하시네요! (밝게) 좋습니다."
    ];

    setStatus("🎭 감정 표현 예시 테스트 시작...");
    
    for (let i = 0; i < examples.length; i++) {
      setStatus(`🎭 예시 ${i + 1}/${examples.length}: ${examples[i]}`);
      await speak(examples[i]);
      // 3초 대기
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    setStatus("✅ 감정 표현 예시 테스트 완료");
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">🔊 TTS 테스트 페이지</h1>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">테스트 텍스트:</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full p-2 border rounded"
            rows={4}
            placeholder="괄호 안에 감정 표현을 넣어보세요. 예: (따뜻하게), (웃으며), (열정적으로)"
          />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">감정 표현 예시:</h3>
          <div className="text-xs text-gray-600 space-y-1">
            <div>• (따뜻하게), (친근하게), (부드럽게)</div>
            <div>• (웃으며), (미소지으며), (밝게)</div>
            <div>• (열정적으로), (확신하며), (강하게)</div>
            <div>• (차분하게), (조용히), (신중하게)</div>
            <div>• (공감하며), (위로하며), (격려하며)</div>
            <div>• (질문하듯), (설명하며), (안내하며)</div>
          </div>
        </div>
        
        <div className="space-x-2">
          <button
            onClick={testTTS}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            🔊 TTS 테스트
          </button>
          
          <button
            onClick={testEmotionExamples}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            🎭 감정 예시 테스트
          </button>
          
          <button
            onClick={testBackendStatus}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            📊 백엔드 상태 확인
          </button>
        </div>
        
        {status && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="font-medium mb-2">상태:</h3>
            <pre className="text-sm whitespace-pre-wrap">{status}</pre>
          </div>
        )}
      </div>
    </div>
  );
} 