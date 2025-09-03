import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

    // 백엔드의 /api/tts 엔드포인트로 요청을 전달합니다.
    const res = await fetch(`${backendUrl}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return new NextResponse(errorText, { status: res.status });
    }

    // 백엔드로부터 받은 오디오 blob을 그대로 클라이언트에 반환합니다.
    const blob = await res.blob();
    return new NextResponse(blob, {
      status: 200,
      headers: { "Content-Type": "audio/mpeg" },
    });

  } catch (err: any) {
    console.error("TTS Proxy API 오류:", err);
    return new NextResponse(err.message || "서버 오류", { status: 500 });
  }
}
