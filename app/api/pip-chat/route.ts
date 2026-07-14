import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callGemini, hasGeminiKey } from "@/lib/gemini";

const PIP_SYSTEM_PROMPT = `You are Pip, a friendly owl who is a reading buddy for children ages 5-12 inside the Book Buddy app.
Rules:
- Keep every reply short: 2-4 sentences, simple words, warm and encouraging tone.
- Only discuss books, reading, stories, and related topics. If asked about anything else, gently steer back to books.
- Never ask for personal information (full name, address, school name, phone number, etc).
- Never discuss anything scary, violent, or inappropriate for children.
- If a child seems upset or mentions being hurt or unsafe, tell them warmly to talk to a parent, teacher, or trusted adult right away.`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasGeminiKey()) {
    return NextResponse.json(
      { error: "Pip isn't set up yet — ask a grown-up to add the AI key." },
      { status: 503 }
    );
  }

  const { message, bookTitle } = await request.json();
  if (!message || !message.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  await supabase.from("pip_messages").insert({
    user_id: user.id,
    role: "user",
    content: message,
  });

  const { data: history } = await supabase
    .from("pip_messages")
    .select("role, content")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const turns = (history ?? [])
    .reverse()
    .map((m) => ({
      role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
      text: m.content,
    }));

  const systemPrompt = bookTitle
    ? `${PIP_SYSTEM_PROMPT}\nThe child is currently reading: "${bookTitle}".`
    : PIP_SYSTEM_PROMPT;

  let reply: string;
  try {
    reply = await callGemini(systemPrompt, turns);
  } catch {
    return NextResponse.json(
      { error: "Pip is taking a nap. Try again in a bit!" },
      { status: 500 }
    );
  }

  await supabase.from("pip_messages").insert({
    user_id: user.id,
    role: "assistant",
    content: reply,
  });

  return NextResponse.json({ reply });
}