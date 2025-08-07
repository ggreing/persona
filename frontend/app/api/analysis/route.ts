import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { sessionId, summary, score } = await req.json();
    if (!sessionId || !summary) {
      return NextResponse.json({ error: "필수값 누락" }, { status: 400 });
    }
    // 점수 업데이트(있으면)
    if (score !== undefined && score !== null) {
      await prisma.session.update({ where: { id: sessionId }, data: { score } });
    }
    // 분석 결과 저장 (upsert)
    await prisma.chatAnalysis.upsert({
      where: { sessionId },
      update: { summary },
      create: { sessionId, summary, keywords: "" },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("분석 저장 오류:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
