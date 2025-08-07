import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/stats/[id] */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const data = await prisma.chatSession.findUnique({ where: { id: params.id } });
  return NextResponse.json(data);
}
