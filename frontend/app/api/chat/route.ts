// frontend/app/api/stats/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "✅ /api/chat 작동 중" });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  const res = await fetch(`${backend}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  // 스트리밍 응답 지원 (SSE)
  if (res.body) {
    return new Response(res.body, {
      status: res.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } else {
    const text = await res.text();
    return new Response(text, { status: res.status });
  }
}