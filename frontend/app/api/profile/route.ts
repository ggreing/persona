import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json("로그인 필요", { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { userId },
    select: {
      id: true,
      userId: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json("사용자를 찾을 수 없습니다", { status: 404 });
  }

  return NextResponse.json(user);
}
