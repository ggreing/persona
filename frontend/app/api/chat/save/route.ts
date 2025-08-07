// frontend/app/api/chat/save/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { sessionId, role, content } = await req.json();

    if (!sessionId || !role || !content) {
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
