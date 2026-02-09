import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  const r = await fetch(process.env.N8N_WEBHOOK_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
     //"x-api-key": process.env.N8N_WEBHOOK_SECRET!, // ถ้าจะส่ง secret ไปให้ n8n ตรวจ ต้องเพิ่ม condition ใน node if
    },
    body: JSON.stringify(body),
  });

  const data = await r.json().catch(() => ({}));
  return NextResponse.json(data, { status: r.status });
}
