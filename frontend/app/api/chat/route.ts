// frontend/app/api/stats/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "✅ /api/stats 작동 중" });
}