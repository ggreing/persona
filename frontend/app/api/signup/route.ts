import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { userId, password } = await req.json();

    const exists = await prisma.user.findUnique({ where: { userId } });
    if (exists) {
      return NextResponse.json("이미 존재하는 사용자입니다.", { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: { userId, hashedPassword },
    });

    return NextResponse.json("회원가입 성공");
  } catch (err) {
    console.error("회원가입 오류:", err);
    return NextResponse.json("서버 오류", { status: 500 });
  }
}
