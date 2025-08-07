export const runtime = "edge";
export async function POST(req: Request) {
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL!;
  const body = await req.text();
  const res = await fetch(`${backend}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const data = await res.text();
  return new Response(data, { status: 200 });
} // ⬅ 누락된 닫는 괄호 추가됨