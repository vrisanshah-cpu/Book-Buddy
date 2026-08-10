import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callGemini, hasGeminiKey } from "@/lib/gemini";

const SYSTEM_PROMPT = `You recommend BookBuy Marketplace listings to a parent or teacher based on
what their kid(s) have read. You will be given the kids' reading interests and a numbered list of
real candidate listings — you may ONLY recommend listings from that list, never invent new ones.
Return ONLY valid JSON, no markdown fences, in this exact shape:
{"recommendations":[{"listingId":"...","why":"one short sentence, under 20 words"}]}
Recommend at most 5. Fewer than 5 is fine if fewer are a good fit. This is a suggestion feature
only — never imply anything has been bought, sold, or reserved.`;

const MAX_CANDIDATES = 40;

/**
 * Read-only, best-effort suggestions. Grounded against real listings: the
 * model picks from a numbered candidate list rather than generating
 * recommendations from scratch, and the response is filtered against that
 * same candidate set before being returned — never trust the model to only
 * return ids it was given.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!profile || (profile.role !== "parent" && profile.role !== "teacher")) {
    return NextResponse.json({ error: "Only parent or teacher accounts can see this." }, { status: 403 });
  }

  if (!hasGeminiKey()) {
    return NextResponse.json({ error: "Recommendations aren't set up yet." }, { status: 503 });
  }

  const kidIds = await getLinkedKidIds(supabase, user.id, profile.role);

  const { data: candidates } = await supabase
    .from("marketplace_listings")
    .select("id, category, title, description, price_cents")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(MAX_CANDIDATES);

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ recommendations: [] });
  }

  let readingSignal = "This parent/teacher's linked kid(s) haven't logged any books yet.";
  if (kidIds.length > 0) {
    const { data: shelf } = await supabase
      .from("user_books")
      .select("book:books(title, author, genre, age_min, age_max)")
      .in("user_id", kidIds);

    const lines = (shelf ?? [])
      .map((r) => {
        const b = Array.isArray(r.book) ? r.book[0] : r.book;
        return b ? `"${b.title}" by ${b.author}${b.genre ? ` (${b.genre})` : ""}` : null;
      })
      .filter(Boolean);

    if (lines.length > 0) {
      readingSignal = `The linked kid(s) have read:\n${Array.from(new Set(lines)).slice(0, 30).join("\n")}`;
    }
  }

  const candidateList = candidates
    .map(
      (c, i) =>
        `${i + 1}. id=${c.id} | category=${c.category} | "${c.title}" | $${(c.price_cents / 100).toFixed(2)} | ${(c.description ?? "").slice(0, 140)}`
    )
    .join("\n");

  const prompt = `${readingSignal}\n\nCandidate marketplace listings:\n${candidateList}\n\nPick the best-fit listings for this family.`;

  try {
    const cacheKey = `marketplace-recommend:v1:${readingSignal}::${candidates.map((c) => c.id).sort().join(",")}`;
    const raw = await callGemini(SYSTEM_PROMPT, [{ role: "user", text: prompt }], {
      jsonMode: true,
      tier: "lite",
      cacheKey,
      cacheTtlMinutes: 60 * 6,
    });

    const parsed = JSON.parse(raw) as { recommendations?: { listingId?: string; why?: string }[] };
    const byId = new Map(candidates.map((c) => [c.id, c]));

    const recommendations = (parsed.recommendations ?? [])
      .filter((r) => r.listingId && byId.has(r.listingId))
      .slice(0, 5)
      .map((r) => ({ listing: byId.get(r.listingId!), why: r.why ?? "" }));

    return NextResponse.json({ recommendations });
  } catch {
    return NextResponse.json({ error: "Couldn't get recommendations right now." }, { status: 500 });
  }
}

async function getLinkedKidIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  role: string
): Promise<string[]> {
  if (role === "parent") {
    const { data } = await supabase.from("parent_child").select("child_id").eq("parent_id", userId);
    return (data ?? []).map((r) => r.child_id);
  }
  const { data } = await supabase.from("teacher_student").select("student_id").eq("teacher_id", userId);
  return (data ?? []).map((r) => r.student_id);
}
