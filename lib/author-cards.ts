import type { SupabaseClient } from "@supabase/supabase-js";
import { callGemini, hasGeminiKey } from "./gemini";

export type CardRarity = "common" | "rare" | "legendary";

// Baseline drop chance for a book by an author the kid already has a card
// for. Guaranteed drops (first time reading an author, or an active
// weekend-event boost) bypass this entirely -- see awardAuthorCardForFinishedBook.
export const CARD_DROP_RATE_BASE = 0.18;

// Emoji pool for dynamically-created "common" cards, so freshly-discovered
// authors don't all render with the same placeholder icon. Purely cosmetic.
const COMMON_ICON_POOL = ["📖", "📚", "✏️", "📝", "🖊️", "📓", "🔖"];

export interface AuthorCard {
  id: string;
  code: string;
  author_name: string;
  fun_fact: string;
  artifact_name: string | null;
  artifact_description: string | null;
  icon: string;
  rarity: CardRarity;
}

export interface AuthorCardResult {
  dropped: boolean;
  card: AuthorCard;
  isNewAuthor: boolean;
  boosted: boolean;
  serialCode?: string;
  quantity?: number;
}

export function slugifyAuthorName(authorName: string): string {
  return authorName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "unknown-author";
}

/** Cheap, deterministic-ish string hash so the same author always maps to the same fallback icon. */
function pickIconFor(code: string): string {
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = (hash * 31 + code.charCodeAt(i)) >>> 0;
  return COMMON_ICON_POOL[hash % COMMON_ICON_POOL.length];
}

interface GeneratedFlavor {
  fun_fact: string;
  artifact_name: string;
  artifact_description: string;
}

function validateFlavor(raw: unknown): GeneratedFlavor | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const { fun_fact, artifact_name, artifact_description } = r;
  if (typeof fun_fact !== "string" || !fun_fact.trim()) return null;
  if (typeof artifact_name !== "string" || !artifact_name.trim()) return null;
  if (typeof artifact_description !== "string" || !artifact_description.trim()) return null;
  return {
    fun_fact: fun_fact.slice(0, 200),
    artifact_name: artifact_name.slice(0, 60),
    artifact_description: artifact_description.slice(0, 200),
  };
}

/**
 * Best-effort flavor text for a newly-discovered author. Unlike the topic
 * scoring in weekend-events.ts, a missing/failed fun fact doesn't block
 * anything -- it just falls back to generic copy, so this fails OPEN rather
 * than closed.
 */
async function generateCardFlavor(authorName: string): Promise<GeneratedFlavor> {
  const fallback: GeneratedFlavor = {
    fun_fact: `${authorName} is one of the many storytellers on your shelf -- their books are worth exploring!`,
    artifact_name: `${authorName}'s Writing Desk`,
    artifact_description: "A well-worn desk, said to have hosted countless first drafts.",
  };

  if (!hasGeminiKey()) return fallback;

  try {
    const raw = await callGemini(
      "You write short, kid-friendly trivia cards about book authors for a reading app aimed at ages 4-9. Respond with ONLY strict JSON, no other text.",
      [
        {
          role: "user",
          text: `Author: "${authorName}".
Write one true or plausible fun fact about them suitable for a young child (max ~30 words), plus one invented, clearly-fictional "memorabilia" item associated with them (an object, place, or symbol -- NOT a weapon) with a short flavor description (max ~25 words).
Respond with ONLY JSON in exactly this shape: {"fun_fact": string, "artifact_name": string, "artifact_description": string}`,
        },
      ],
      { jsonMode: true }
    );
    const parsed = validateFlavor(JSON.parse(raw));
    return parsed ?? fallback;
  } catch {
    // Fail open -- see comment above.
    return fallback;
  }
}

/**
 * Looks up the catalog card for an author, creating one at 'common' rarity
 * on first encounter. Seeded classics (see migration 014) already exist at
 * their curated rarity and are never re-generated.
 */
export async function getOrCreateAuthorCard(
  supabase: SupabaseClient,
  authorName: string
): Promise<AuthorCard> {
  const code = slugifyAuthorName(authorName);

  const { data: existing } = await supabase
    .from("author_cards")
    .select("id, code, author_name, fun_fact, artifact_name, artifact_description, icon, rarity")
    .eq("code", code)
    .maybeSingle();

  if (existing) return existing as AuthorCard;

  const flavor = await generateCardFlavor(authorName);

  const { data: inserted, error } = await supabase
    .from("author_cards")
    .insert({
      code,
      author_name: authorName,
      fun_fact: flavor.fun_fact,
      artifact_name: flavor.artifact_name,
      artifact_description: flavor.artifact_description,
      icon: pickIconFor(code),
      rarity: "common",
    })
    .select("id, code, author_name, fun_fact, artifact_name, artifact_description, icon, rarity")
    .single();

  if (inserted) return inserted as AuthorCard;

  // Lost a race with another kid discovering the same new author at the
  // same moment -- `code` is unique, so re-select instead of erroring out.
  const { data: afterConflict } = await supabase
    .from("author_cards")
    .select("id, code, author_name, fun_fact, artifact_name, artifact_description, icon, rarity")
    .eq("code", code)
    .single();

  if (afterConflict) return afterConflict as AuthorCard;

  throw error ?? new Error(`Could not get or create author card for "${authorName}"`);
}

/** e.g. "AUTH-SHAK-482913". Not guaranteed globally unique -- see migration 014's comment. */
export function mintSerialCode(code: string): string {
  const prefix = code.replace(/-/g, "").slice(0, 4).toUpperCase().padEnd(4, "X");
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `AUTH-${prefix}-${digits}`;
}

/**
 * Called right after a book is marked finished. Rolls for an author card:
 *   - guaranteed if this is the kid's first-ever finished book by this author
 *   - guaranteed if `boosted` (an active weekend event was running -- see
 *     the caller in app/api/reading/log/route.ts for how that's decided)
 *   - otherwise CARD_DROP_RATE_BASE baseline chance
 * Swallows its own errors at the call site's discretion -- this is a bonus
 * collectible layer and should never be able to block the core finish-book
 * flow (XP, streaks, challenges, event progress).
 */
export async function awardAuthorCardForFinishedBook(
  supabase: SupabaseClient,
  userId: string,
  bookId: string,
  boosted: boolean
): Promise<AuthorCardResult | null> {
  const { data: book } = await supabase.from("books").select("author").eq("id", bookId).single();
  if (!book?.author) return null;

  const card = await getOrCreateAuthorCard(supabase, book.author);

  const { data: existing } = await supabase
    .from("user_author_cards")
    .select("quantity, serial_codes")
    .eq("user_id", userId)
    .eq("card_id", card.id)
    .maybeSingle();

  const isNewAuthor = !existing;
  const dropped = isNewAuthor || boosted || Math.random() < CARD_DROP_RATE_BASE;

  if (!dropped) {
    return { dropped: false, card, isNewAuthor: false, boosted };
  }

  const serialCode = mintSerialCode(card.code);

  if (existing) {
    const newQuantity = (existing.quantity ?? 1) + 1;
    await supabase
      .from("user_author_cards")
      .update({
        quantity: newQuantity,
        serial_codes: [...(existing.serial_codes ?? []), serialCode],
        last_earned_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("card_id", card.id);

    return { dropped: true, card, isNewAuthor: false, boosted, serialCode, quantity: newQuantity };
  }

  await supabase.from("user_author_cards").insert({
    user_id: userId,
    card_id: card.id,
    quantity: 1,
    serial_codes: [serialCode],
    source_event_id: null, // event linkage is best-effort flavor, not load-bearing -- left null here
  });

  return { dropped: true, card, isNewAuthor: true, boosted, serialCode, quantity: 1 };
}
