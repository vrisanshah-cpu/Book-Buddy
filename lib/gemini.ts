import { createAdminClient } from "@/lib/supabase/admin";
import { createHash } from "crypto";

interface GeminiTurn {
  role: "user" | "model";
  text: string;
}

/**
 * Tier 1 ("lite"/"flash") covers simple, high-volume work: light chat,
 * quiz/flashcard generation, standard Q&A, recommendations. Tier 2
 * ("pro") is reserved for genuinely hard reasoning -- multi-step
 * literary critique, deep analytical writing evaluation. Default to
 * "lite" everywhere unless a call site has an explicit reason to
 * upgrade; upgrading is opt-in, not opt-out.
 */
export type GeminiTier = "lite" | "flash" | "pro";

const MODEL_BY_TIER: Record<GeminiTier, string> = {
  lite: "gemini-3.1-flash-lite",
  flash: "gemini-3.1-flash",
  pro: "gemini-3.1-pro",
};

interface CallGeminiOpts {
  jsonMode?: boolean;
  /** Defaults to "lite". Only pass "pro" for genuinely complex reasoning. */
  tier?: GeminiTier;
  /**
   * When provided, identical requests reuse a cached response instead of
   * hitting the API. Build this from the semantically-meaningful inputs
   * only (e.g. book title + author for a quiz) -- NOT from anything
   * containing a user id, timestamp, or per-user personalization, or
   * you'll defeat caching entirely by making every key unique.
   */
  cacheKey?: string;
  /** How long a cached response stays valid. Defaults to 24 hours. */
  cacheTtlMinutes?: number;
}

function hashCacheKey(rawKey: string, model: string): string {
  return createHash("sha256").update(`${model}:${rawKey}`).digest("hex");
}

async function getCached(hashedKey: string): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("ai_response_cache")
      .select("response, expires_at")
      .eq("cache_key", hashedKey)
      .maybeSingle();

    if (!data) return null;
    if (new Date(data.expires_at) < new Date()) return null;
    return data.response as string;
  } catch {
    // Cache is a pure optimization -- never let a cache read failure
    // block or break the actual Gemini call.
    return null;
  }
}

async function setCached(hashedKey: string, response: string, ttlMinutes: number): Promise<void> {
  try {
    const admin = createAdminClient();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString();
    await admin.from("ai_response_cache").upsert({
      cache_key: hashedKey,
      response,
      expires_at: expiresAt,
    });
  } catch {
    // Same as above -- never let a cache write failure surface to the caller.
  }
}

export async function callGemini(
  systemInstruction: string,
  turns: GeminiTurn[],
  opts?: CallGeminiOpts
): Promise<string> {
  const tier = opts?.tier ?? "lite";
  const model = MODEL_BY_TIER[tier];

  const hashedKey = opts?.cacheKey ? hashCacheKey(opts.cacheKey, model) : null;
  if (hashedKey) {
    const cached = await getCached(hashedKey);
    if (cached !== null) return cached;
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY!,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
        generationConfig: opts?.jsonMode
          ? { responseMimeType: "application/json" }
          : undefined,
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini API error: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no text");

  if (hashedKey) {
    await setCached(hashedKey, text, opts?.cacheTtlMinutes ?? 60 * 24);
  }

  return text;
}

export function hasGeminiKey() {
  return Boolean(process.env.GEMINI_API_KEY);
}
