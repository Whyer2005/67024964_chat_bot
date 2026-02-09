"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Msg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  ts: number;
};

function uuid() {
  // Simple stable id (no external deps)
  return crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function Page() {
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: uuid(),
      role: "assistant",
      text: "สวัสดีครับ พิมพ์ข้อความเพื่อเริ่มแชทได้เลย",
      ts: Date.now(),
    },
  ]);
  const currentUser = {
  id: "U-001",
  name: "Somchai",
  };
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Create a session id once
  useEffect(() => {
    setSessionId(uuid());
  }, []);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const canSend = useMemo(() => text.trim().length > 0 && !busy && sessionId, [text, busy, sessionId]);

  async function send() {
    const userText = text.trim();
    if (!userText || busy) return;

    setText("");
    setBusy(true);

    const userMsg: Msg = { id: uuid(), role: "user", text: userText, ts: Date.now() };
    setMessages((m) => [...m, userMsg]);

    const typingId = uuid();
    setMessages((m) => [
      ...m,
      { id: typingId, role: "assistant", text: "กำลังตอบ...", ts: Date.now() },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          user_id: currentUser.id,
          customer_name: currentUser.name,
          message: userText,
        }),
      });

      const data = await res.json().catch(() => ({}));

      // Hard-fail safe
      let reply: string =
        typeof data?.reply === "string" && data.reply.trim() !== ""
          ? data.reply
          : "ขอโทษครับ ระบบไม่สามารถตอบได้ในขณะนี้";

      // If reply accidentally contains n8n template, replace with safe message
      if (reply.includes("{{$json") || reply.includes("={{$json")) {
        reply = "ขอโทษครับ ระบบตอบกลับผิดรูปแบบ (ตรวจสอบ n8n response)";
      }

      // Update session id if backend returns one
      if (typeof data?.session_id === "string" && data.session_id.trim() !== "") {
        setSessionId(data.session_id);
      }

      // Replace typing placeholder with actual reply
      setMessages((m) =>
        m.map((x) => (x.id === typingId ? { ...x, text: reply, ts: Date.now() } : x))
      );
    } catch (e) {
      // Replace typing placeholder with error
      setMessages((m) =>
        m.map((x) =>
          x.id === typingId
            ? { ...x, text: "เกิดข้อผิดพลาดในการเชื่อมต่อ", ts: Date.now() }
            : x
        )
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-white p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold text-black">MVP Web Chat (Next.js → n8n → Gemini)</h1>

        <div className="mt-4 rounded-xl border p-4">
          <div className="h-[520px] overflow-y-auto rounded-lg border bg-white p-4">
            <div className="space-y-6">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[75%] rounded-lg border p-3">
                    <div className="text-xs text-gray-900">{m.role}</div>
                    <div className="whitespace-pre-wrap text-base font-medium text-black">{m.text}</div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <input
              className="flex-1 rounded-lg border px-4 py-3 text-base text-black"
              placeholder="พิมพ์ข้อความ..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              disabled={busy}
            />
            <button
              className="rounded-lg bg-black px-6 py-3 text-white disabled:opacity-50"
              onClick={send}
              disabled={!canSend}
            >
              Send
            </button>
          </div>

          <div className="mt-3 text-sm text-gray-600">
            Session: <span className="font-mono">{sessionId}</span>
          </div>
        </div>
      </div>
    </main>
  );
}
