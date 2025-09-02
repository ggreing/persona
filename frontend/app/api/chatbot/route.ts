import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const body = await req.json();
  let message = body.message;
  let session_id = body.session_id;
  // messages 배열이 오면 마지막 user 메시지와 session_id를 자동 추출
  if ((!message || !session_id) && Array.isArray(body.messages)) {
    const lastUserMsg = [...body.messages].reverse().find((m) => m.role === 'user' && m.content && typeof m.content === 'string' && m.content.trim());
    if (lastUserMsg) message = lastUserMsg.content;
    // session_id를 messages 배열의 첫 메시지에서 추출 (예시)
    if (!session_id && body.messages.length > 0 && body.messages[0].session_id) {
      session_id = body.messages[0].session_id;
    }
  }
  if (!message || typeof message !== 'string' || !message.trim()) {
    return new Response('message required', { status: 400 });
  }
  if (!session_id || typeof session_id !== 'string' || !session_id.trim()) {
    return new Response('session_id required', { status: 400 });
  }

  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000/chatbot';

  const backendRes = await fetch(backendUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, session_id }),
  });

  if (!backendRes.body) {
    return new Response('No response body from backend', { status: 500 });
  }

  return new Response(backendRes.body, {
    status: backendRes.status,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
