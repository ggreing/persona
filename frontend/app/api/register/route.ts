import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const hashed = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "이미 등록된 이메일입니다." }, { status: 400 });
  }

  const user = await prisma.user.create({
    data: { email, password: hashed },
  });

  return NextResponse.json({ success: true, userId: user.id });
}
