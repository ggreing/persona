import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma"; // 경로 주의

// ✅ POST: 세션 + 페르소나 생성
export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");

  if (!userId) {
    return NextResponse.json({ error: "인증 정보가 없습니다." }, { status: 401 });
  }

  try {
    const body = await req.json();

    const newPersona = await prisma.persona.create({
      data: {
        gender: body.persona.gender,
        age_group: body.persona.age_group,
        personality: body.persona.personality,
        tech: body.persona.tech,
        goal: body.persona.goal,
        usage: body.persona.usage,
        type: body.persona.type,
      },
    });

    const session = await prisma.session.create({
      data: {
        userId,
        score: body.score,
        startedAt: new Date(),
        personaId: newPersona.id,
      },
    });

    return NextResponse.json(session);
  } catch (err) {
    console.error("세션 생성 실패:", err);
    return NextResponse.json({ error: "세션 생성 실패" }, { status: 500 });
  }
}

// ✅ GET: 세션 목록 조회
export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");

  if (!userId) {
    return NextResponse.json({ error: "인증 정보가 없습니다." }, { status: 401 });
  }

  try {
    const sessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        startedAt: true,
        score: true,
        persona: {
          select: {
            gender: true,
            age_group: true,
            personality: true,
            tech: true,
            goal: true,
            usage: true,
            type: true,
          },
        },
      },
    });

    return NextResponse.json(sessions);
  } catch (err) {
    console.error("세션 조회 실패:", err);
    return NextResponse.json({ error: "세션 조회 실패" }, { status: 500 });
  }
}
