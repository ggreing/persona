// hooks/useTTS.ts
const backend = process.env.NEXT_PUBLIC_BACKEND_URL!;

export default function useTTS() {
  const speak = async (text: string, persona?: any) => {
    if (!text) return;
    
    console.log("🔊 TTS 호출 시작:", text.substring(0, 50) + "...");
    if (persona) {
      console.log("👤 페르소나 정보:", persona.gender, persona.personality);
    }
    
    try {
      const res = await fetch(`${backend}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text,
          persona: persona || null
        }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("❌ TTS API 오류:", errorText);
        return;
      }
      
      console.log("✅ TTS 응답 받음, 오디오 재생 시작");
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      // 오디오 재생 이벤트 리스너 추가
      audio.onloadstart = () => console.log("🎵 오디오 로딩 시작");
      audio.oncanplay = () => console.log("🎵 오디오 재생 준비 완료");
      audio.onplay = () => console.log("🎵 오디오 재생 시작");
      audio.onended = () => {
        console.log("🎵 오디오 재생 완료");
        URL.revokeObjectURL(url); // 메모리 정리
      };
      audio.onerror = (e) => console.error("❌ 오디오 재생 오류:", e);
      
      await audio.play();
      
    } catch (err) {
      console.error("❌ TTS 처리 중 오류:", err);
    }
  };
  
  return { speak };
}
