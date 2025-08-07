export const runtime = "nodejs";
const backend = process.env.NEXT_PUBLIC_BACKEND_URL!;

export async function GET() {
  const res = await fetch(`${backend}/persona/random`, { cache: "no-store" });
  const data = await res.json();
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" }
  });
}
