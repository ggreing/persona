// frontend/app/api/persona/route.ts
export const runtime = "nodejs";

const backend = process.env.NEXT_PUBLIC_BACKEND_URL!;

// 전체 페르소나 리스트
export async function GET() {
  const res = await fetch(`${backend}/persona`, { cache: "no-store" });
  const text = await res.text();
  let data = [];
  try {
    data = text ? JSON.parse(text) : [];
  } catch (e) {}
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" }
  });
}

// 등록
export async function POST(req: Request) {
  const body = await req.json();
  const res = await fetch(`${backend}/persona`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
    status: res.status,
  });
}

// 삭제
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return new Response(JSON.stringify({ error: "ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const res = await fetch(`${backend}/persona/${id}`, { method: "DELETE" });
  const result = await res.json();
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
    status: res.status,
  });
}
