// app/api/tts/route.ts
import { NextResponse } from "next/server";

const backend = process.env.NEXT_PUBLIC_BACKEND_URL!;

export async function POST(req: Request) {
  const { text } = await req.json();

  if (!text) {
    return new NextResponse("텍스트가 없습니다", { status: 400 });
  }

  try {
    console.log("🔄 프론트엔드 TTS API 호출:", text.substring(0, 50) + "...");
    
    // 백엔드 TTS API 호출
    const res = await fetch(`${backend}/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ 백엔드 TTS 오류:", errorText);
      return new NextResponse(`백엔드 TTS 오류: ${errorText}`, { status: res.status });
    }

    console.log("✅ 백엔드 TTS 응답 성공");
    
    const audioBuffer = await res.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.byteLength),
      },
    });
  } catch (err) {
    console.error("❌ TTS API 오류", err);
    return new NextResponse("TTS 처리 중 오류 발생", { status: 500 });
  }
}
