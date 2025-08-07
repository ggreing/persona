// app/api/scenarios/route.ts
export const runtime = "edge";

export async function GET() {
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL!;
  const res = await fetch(`${backend}/scenarios`);
  const data = await res.text();
  return new Response(data, { status: 200 });
}
