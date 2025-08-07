// app/api/stats/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionId = params.id;
  const userId = req.headers.get("x-user-id");

  if (!userId) {
    return NextResponse.json({ error: "인증 정보가 없습니다." }, { status: 401 });
  }

  if (!sessionId) {
    return NextResponse.json({ error: "세션 ID가 필요합니다." }, { status: 400 });
  }

  try {
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      select: {
        id: true,
        startedAt: true,
        score: true,
        persona: {
          select: {
            type: true,
            personality: true,
            age_group: true,
            gender: true,
            goal: true,
            usage: true,
            tech: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (err) {
    console.error("세션 상세 조회 오류:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
