// frontend/app/api/persona/field/route.ts
export const runtime = "nodejs";

const backend = process.env.NEXT_PUBLIC_BACKEND_URL!;

// 특정 필드의 모든 고유 값들을 가져오기
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const field = searchParams.get("field");
  
  if (!field) {
    return new Response(JSON.stringify({ error: "Field parameter is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const res = await fetch(`${backend}/persona`, { cache: "no-store" });
    const text = await res.text();
    let data = [];
    
    try {
      data = text ? JSON.parse(text) : [];
    } catch (e) {
      data = [];
    }

    // 해당 필드의 고유한 값들만 추출
    const uniqueValues = [...new Set(data.map((item: any) => item[field]).filter(Boolean))];
    
    return new Response(JSON.stringify(uniqueValues), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to fetch field values" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// 특정 필드에 새로운 값 추가
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const field = searchParams.get("field");
  const body = await req.json();
  const { value } = body;

  if (!field || !value) {
    return new Response(JSON.stringify({ error: "Field and value are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // 새로운 페르소나를 생성하여 해당 필드만 설정
    const newPersona = {
      age_group: "",
      gender: "",
      tech: "",
      type: "",
      usage: "",
      goal: "",
      personality: "",
      [field]: value
    };

    const res = await fetch(`${backend}/persona`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPersona),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
      status: res.status,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to add field value" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// 특정 필드의 값 삭제
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const field = searchParams.get("field");
  const value = searchParams.get("value");

  if (!field || !value) {
    return new Response(JSON.stringify({ error: "Field and value parameters are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // 해당 값을 가진 모든 페르소나를 찾아서 삭제
    const res = await fetch(`${backend}/persona`, { cache: "no-store" });
    const text = await res.text();
    let data = [];
    
    try {
      data = text ? JSON.parse(text) : [];
    } catch (e) {
      data = [];
    }

    const personasToDelete = data.filter((item: any) => item[field] === value);
    
    // 각 페르소나를 삭제
    for (const persona of personasToDelete) {
      if (persona.id) {
        await fetch(`${backend}/persona/${persona.id}`, { method: "DELETE" });
      }
    }

    return new Response(JSON.stringify({ success: true, deletedCount: personasToDelete.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to delete field value" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
} 