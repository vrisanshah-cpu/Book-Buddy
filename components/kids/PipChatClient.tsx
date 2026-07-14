"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function PipChatClient({ userId }: { userId: string }) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from("pip_messages")
      .select("role, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages((data as Message[]) ?? []));
  }, [userId, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setSending(true);

    const res = await fetch("/api/pip-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    const data = await res.json();
    setSending(false);

    if (res.ok) {
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } else {
      setMessages((m) => [...m, { role: "assistant", content: data.error ?? "Something went wrong." }]);
    }
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-2xl bg-white shadow-md">
      <div className="flex items-center gap-3 border-b p-4">
        <span className="text-3xl">🦉</span>
        <div>
          <p className="font-bold">Pip</p>
          <p className="text-xs text-slate-500">Your AI reading buddy</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-slate-400">
            Say hi to Pip! Ask about books you love or want to try.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
              m.role === "user" ? "ml-auto bg-kids-purple text-white" : "bg-violet-50 text-slate-800"
            }`}
          >
            {m.content}
          </div>
        ))}
        {sending && (
          <div className="max-w-[80%] rounded-2xl bg-violet-50 px-4 py-2 text-sm text-slate-400">
            Pip is thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 border-t p-4">
        <input
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2 outline-none focus:border-violet-400"
          placeholder="Ask Pip something…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <Button variant="kids" onClick={send} disabled={sending}>
          Send
        </Button>
      </div>
    </div>
  );
}