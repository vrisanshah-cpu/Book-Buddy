import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callGemini, hasGeminiKey } from "@/lib/gemini";

const SYSTEM_PROMPT = `You recommend books to children ages 5-12 based on what they've already read.
Return ONLY valid JSON, no markdown fences, in this exact shape:
{"recommendations":[{"title":"...","author":"...","why":"one short kid-friendly sentence"}]}
Recommend exactly 5 books. Do not recommend books already in the child's list. Keep "why" under 20 words and age-appropriate.`;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasGeminiKey()) {
    return NextResponse.json({ error: "Recommendations aren't set up yet." }, { status: 503 });
  }

  const { data: shelf } = await supabase
    .from("user_books")
    .select("status, book:books(title, author, genre)")
    .eq("user_id", user.id);

  const readBooks = (shelf ?? [])
    .map((r) => {
      const b = Array.isArray(r.book) ? r.book[0] : r.book;
      return b ? `"${b.title}" by ${b.author}${b.genre ? ` (${b.genre})` : ""} — ${r.status}` : null;
    })
    .filter(Boolean);

  const prompt =
    readBooks.length > 0
      ? `Here is the child's reading list so far:\n${readBooks.join("\n")}\n\nRecommend 5 new books they'd probably love.`
      : `This child hasn't logged any books yet. Recommend 5 great, popular books for kids ages 5-12 across different genres.`;

  try {
    const raw = await callGemini(SYSTEM_PROMPT, [{ role: "user", text: prompt }], { jsonMode: true });
    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Couldn't get recommendations right now." }, { status: 500 });
  }
}