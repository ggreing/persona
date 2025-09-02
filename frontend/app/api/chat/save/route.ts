// frontend/app/api/chat/save/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("chat/save body:", body); // 실제 전달값 로그
    const sessionId = body.sessionId || body.session_id;
    const role = body.role;
    const content = body.content;

    // content가 null/undefined만 400, 빈 문자열은 허용
    if (!sessionId || !role || content === null || content === undefined) {
      return NextResponse.json({ error: "필수값 누락" }, { status: 400 });
    }

    await prisma.chatMessage.create({
      data: {
        sessionId,
        role,
        content,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("메시지 저장 오류:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
