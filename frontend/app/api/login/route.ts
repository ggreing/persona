import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { userId, password } = await req.json();

    const user = await prisma.user.findUnique({ where: { userId } });

    if (!user) {
      return NextResponse.json("존재하지 않는 사용자입니다.", { status: 404 });
    }

    const isValid = await bcrypt.compare(password, user.hashedPassword);
    if (!isValid) {
      return NextResponse.json("비밀번호가 일치하지 않습니다.", { status: 401 });
    }

    return NextResponse.json({ success: true, userId });
  } catch (err) {
    console.error("로그인 오류:", err);
    return NextResponse.json("서버 오류로 로그인 실패", { status: 500 });
  }
}
