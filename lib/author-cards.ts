import type { SupabaseClient } from "@supabase/supabase-js";

// =============================================================================
// RARITY
// =============================================================================

export const RARITY_TIERS = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "mythic",
  "ethereal",
  "divine",
] as const;

export type CardRarity = (typeof RARITY_TIERS)[number];
export type CardCategory = "author" | "item" | "location";

// Baseline drop chance for a book by an author the kid already has an
// author card for (i.e. rolling for an item/location, not a duplicate
// author unlock). Guaranteed drops (an active weekend event boost) bypass
// this -- see awardCollectibleForFinishedBook.
export const CARD_DROP_RATE_BASE = 0.18;

/**
 * An item/location's rarity is biased toward its parent author's rarity --
 * "special" authors turn up special relics. Centered one tier BELOW the
 * author (items are usually humbler than the author themselves), with a
 * small chance to land above, clamped to the valid range.
 */
export function rollDependentRarity(authorRarity: CardRarity): CardRarity {
  const authorIndex = RARITY_TIERS.indexOf(authorRarity);
  const roll = Math.random();
  // offsets, cumulative: -2 (8%), -1 (27%), 0 (32%), +1 (23%), +2 (10%)
  let offset: number;
  if (roll < 0.08) offset = -2;
  else if (roll < 0.35) offset = -1;
  else if (roll < 0.67) offset = 0;
  else if (roll < 0.9) offset = 1;
  else offset = 2;

  const clamped = Math.min(RARITY_TIERS.length - 1, Math.max(0, authorIndex + offset));
  return RARITY_TIERS[clamped];
}

// =============================================================================
// CATALOG TYPES
// =============================================================================

export interface CollectibleCard {
  id: string;
  code: string;
  category: CardCategory;
  author_name: string; // for item/location rows this holds the item/location's own display name
  fun_fact: string;
  artifact_name: string | null;
  artifact_description: string | null;
  icon: string;
  rarity: CardRarity;
  book_id: string | null;
  linked_author_card_id: string | null;
}

export interface CollectibleResult {
  dropped: boolean;
  category: CardCategory;
  card: CollectibleCard;
  isNewAuthor: boolean;
  boosted: boolean;
  serialCode?: string;
  quantity?: number;
}

export function slugify(input: string): string {
  return (
    input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "unknown"
  );
}

// =============================================================================
// DETERMINISTIC, INSTANT FLAVOR TEXT
// =============================================================================
// No network calls here on purpose -- this used to call out to Gemini on
// every single new-author drop, which added a real multi-second stall to
// the finish-book request (see chat: "its very laggy"). Item/location
// cards are generated far more often than author cards (every qualifying
// book, not just the first per author), so an AI round trip here would
// have made it worse, not better. Templates keyed loosely off book genre
// give enough variety without ever leaving the process.

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  return hash;
}

function pick<T>(pool: T[], seed: number): T {
  return pool[seed % pool.length];
}

type GenreBucket = "fantasy" | "mystery" | "adventure" | "animal" | "scifi" | "default";

function genreBucket(genre: string | null): GenreBucket {
  const g = (genre ?? "").toLowerCase();
  if (/fantasy|magic|myth|dragon|fairy|wizard/.test(g)) return "fantasy";
  if (/mystery|detective|spy|clue|crime/.test(g)) return "mystery";
  if (/adventure|pirate|ocean|island|journey/.test(g)) return "adventure";
  if (/animal|nature|jungle|wild|farm/.test(g)) return "animal";
  if (/sci-?fi|science|space|robot|future/.test(g)) return "scifi";
  return "default";
}

const ITEM_POOL: Record<GenreBucket, { nouns: string[]; materials: string[]; icons: string[] }> = {
  fantasy: {
    nouns: ["Amulet", "Wand", "Grimoire", "Cloak", "Ring"],
    materials: ["Enchanted", "Moonlit", "Runed", "Silver", "Shimmering"],
    icons: ["🔮", "🪄", "📜", "🧥", "💍"],
  },
  mystery: {
    nouns: ["Key", "Magnifying Glass", "Notebook", "Lockpick", "Envelope"],
    materials: ["Brass", "Weathered", "Coded", "Hidden", "Dusty"],
    icons: ["🔑", "🔎", "📓", "🗝️", "✉️"],
  },
  adventure: {
    nouns: ["Map", "Compass", "Spyglass", "Anchor", "Flag"],
    materials: ["Torn", "Salt-worn", "Faded", "Weatherbeaten", "Sun-bleached"],
    icons: ["🗺️", "🧭", "🔭", "⚓", "🚩"],
  },
  animal: {
    nouns: ["Collar", "Feather", "Nest", "Paw Print", "Whistle"],
    materials: ["Woven", "Speckled", "Gentle", "Forest-worn", "Sturdy"],
    icons: ["🪶", "🕊️", "🪺", "🐾", "📯"],
  },
  scifi: {
    nouns: ["Circuit", "Beacon", "Visor", "Module", "Star Chart"],
    materials: ["Glowing", "Ion-forged", "Ancient", "Signal-worn", "Chrome"],
    icons: ["🔋", "📡", "🥽", "🛰️", "🌌"],
  },
  default: {
    nouns: ["Journal", "Lantern", "Quill", "Locket", "Bookmark"],
    materials: ["Worn", "Handwritten", "Antique", "Well-loved", "Faded"],
    icons: ["📔", "🏮", "🖋️", "📿", "🔖"],
  },
};

const LOCATION_POOL: Record<GenreBucket, { words: string[]; icons: string[] }> = {
  fantasy: { words: ["Hollow", "Spire", "Grove", "Keep", "Vale"], icons: ["🏰", "🌳", "⛰️", "🌙", "✨"] },
  mystery: { words: ["Alley", "Study", "Attic", "Archive", "Corridor"], icons: ["🕵️", "📚", "🕯️", "🗄️", "🚪"] },
  adventure: { words: ["Cove", "Reef", "Ridge", "Harbor", "Isle"], icons: ["🏝️", "🌊", "⛵", "🏔️", "🐚"] },
  animal: { words: ["Meadow", "Burrow", "Thicket", "Clearing", "Den"], icons: ["🌾", "🦔", "🌿", "🦉", "🐿️"] },
  scifi: { words: ["Station", "Outpost", "Nebula", "Colony", "Relay"], icons: ["🛸", "🪐", "🌠", "🚀", "🛰️"] },
  default: { words: ["Corner", "Nook", "Bend", "Shelf", "Path"], icons: ["📍", "🏡", "🌆", "📖", "🚶"] },
};

const ITEM_DESCRIPTIONS = [
  (title: string) => `Said to have once belonged to a character in "${title}".`,
  (title: string) => `A curious keepsake that shows up right at the turning point of "${title}".`,
  (title: string) => `Kept safe by whoever finishes reading "${title}" -- or so the story goes.`,
];

const LOCATION_DESCRIPTIONS = [
  (title: string) => `A place straight out of "${title}", where the story's biggest moments unfold.`,
  (title: string) => `Marked on every map of the world of "${title}".`,
  (title: string) => `Readers of "${title}" always remember this spot first.`,
];

function buildItemFlavor(title: string, genre: string | null) {
  const bucket = genreBucket(genre);
  const pool = ITEM_POOL[bucket];
  const seed = hashString(title);
  const noun = pick(pool.nouns, seed);
  const material = pick(pool.materials, seed >> 3);
  const icon = pick(pool.icons, seed >> 5);
  const description = pick(ITEM_DESCRIPTIONS, seed >> 7)(title);
  return { name: `The ${material} ${noun}`, description, icon };
}

function buildLocationFlavor(title: string, genre: string | null) {
  const bucket = genreBucket(genre);
  const pool = LOCATION_POOL[bucket];
  const seed = hashString(title);
  const word = pick(pool.words, seed >> 2);
  const icon = pick(pool.icons, seed >> 4);
  const description = pick(LOCATION_DESCRIPTIONS, seed >> 6)(title);
  return { name: `The ${word} of ${title}`, description, icon };
}

const AUTHOR_ICON_POOL = ["📖", "📚", "✏️", "📝", "🖊️", "📓", "🔖"];
const AUTHOR_FUN_FACTS = [
  (name: string) => `${name} is one of the many storytellers on your shelf -- their books are worth exploring!`,
  (name: string) => `Every book by ${name} adds a new chapter to your collection.`,
  (name: string) => `${name}'s stories have found their way onto your shelf -- keep reading to learn more!`,
];

// =============================================================================
// CATALOG LOOKUP / CREATION
// =============================================================================

const CARD_COLUMNS =
  "id, code, category, author_name, fun_fact, artifact_name, artifact_description, icon, rarity, book_id, linked_author_card_id";

/**
 * Looks up the catalog card for an author, creating one at 'common' rarity
 * on first encounter. Seeded classics (see migration 015) already exist at
 * their curated rarity and are never re-generated.
 */
export async function getOrCreateAuthorCard(
  supabase: SupabaseClient,
  authorName: string
): Promise<CollectibleCard> {
  const code = slugify(authorName);

  const { data: existing } = await supabase
    .from("author_cards")
    .select(CARD_COLUMNS)
    .eq("code", code)
    .eq("category", "author")
    .maybeSingle();

  if (existing) return existing as CollectibleCard;

  const seed = hashString(code);
  const { data: inserted, error } = await supabase
    .from("author_cards")
    .insert({
      code,
      category: "author",
      author_name: authorName,
      fun_fact: pick(AUTHOR_FUN_FACTS, seed)(authorName),
      artifact_name: null,
      artifact_description: null,
      icon: pick(AUTHOR_ICON_POOL, seed >> 2),
      rarity: "common",
    })
    .select(CARD_COLUMNS)
    .single();

  if (inserted) return inserted as CollectibleCard;

  // Lost a race with another kid discovering the same new author at the
  // same moment -- `code` is unique, so re-select instead of erroring out.
  const { data: afterConflict } = await supabase
    .from("author_cards")
    .select(CARD_COLUMNS)
    .eq("code", code)
    .eq("category", "author")
    .single();

  if (afterConflict) return afterConflict as CollectibleCard;

  throw error ?? new Error(`Could not get or create author card for "${authorName}"`);
}

/**
 * Looks up (or creates) the item/location catalog card tied to one
 * specific book. Rarity is rolled once, at creation time, biased off the
 * parent author's rarity -- see rollDependentRarity.
 */
export async function getOrCreateBookCollectible(
  supabase: SupabaseClient,
  opts: {
    bookId: string;
    bookTitle: string;
    genre: string | null;
    category: "item" | "location";
    authorCard: CollectibleCard;
  }
): Promise<CollectibleCard> {
  const code = `${opts.category}-${slugify(opts.bookTitle)}-${opts.bookId.slice(0, 8)}`;

  const { data: existing } = await supabase
    .from("author_cards")
    .select(CARD_COLUMNS)
    .eq("code", code)
    .maybeSingle();

  if (existing) return existing as CollectibleCard;

  const flavor =
    opts.category === "item"
      ? buildItemFlavor(opts.bookTitle, opts.genre)
      : buildLocationFlavor(opts.bookTitle, opts.genre);

  const { data: inserted, error } = await supabase
    .from("author_cards")
    .insert({
      code,
      category: opts.category,
      author_name: flavor.name,
      fun_fact: flavor.description,
      artifact_name: null,
      artifact_description: null,
      icon: flavor.icon,
      rarity: rollDependentRarity(opts.authorCard.rarity),
      book_id: opts.bookId,
      linked_author_card_id: opts.authorCard.id,
    })
    .select(CARD_COLUMNS)
    .single();

  if (inserted) return inserted as CollectibleCard;

  const { data: afterConflict } = await supabase
    .from("author_cards")
    .select(CARD_COLUMNS)
    .eq("code", code)
    .single();

  if (afterConflict) return afterConflict as CollectibleCard;

  throw error ?? new Error(`Could not get or create ${opts.category} card for "${opts.bookTitle}"`);
}

/** e.g. "AUTH-SHAK-482913" / "ITEM-THEW-118204". Not guaranteed globally unique -- flavor only. */
export function mintSerialCode(code: string, category: CardCategory): string {
  const category_prefix = category === "author" ? "AUTH" : category === "item" ? "ITEM" : "LOC";
  const bodyPrefix = code.replace(/-/g, "").slice(0, 4).toUpperCase().padEnd(4, "X");
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `${category_prefix}-${bodyPrefix}-${digits}`;
}

async function grantCard(
  supabase: SupabaseClient,
  userId: string,
  card: CollectibleCard
): Promise<{ serialCode: string; quantity: number; isNew: boolean }> {
  const { data: existing } = await supabase
    .from("user_author_cards")
    .select("quantity, serial_codes")
    .eq("user_id", userId)
    .eq("card_id", card.id)
    .maybeSingle();

  const serialCode = mintSerialCode(card.code, card.category);

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
    return { serialCode, quantity: newQuantity, isNew: false };
  }

  await supabase.from("user_author_cards").insert({
    user_id: userId,
    card_id: card.id,
    quantity: 1,
    serial_codes: [serialCode],
  });
  return { serialCode, quantity: 1, isNew: true };
}

/**
 * Called right after a book is marked finished.
 *   - First-ever finished book by this author -> guaranteed AUTHOR card.
 *     Does not also roll for an item/location on this same call.
 *   - Every subsequent book by an author the kid already has -> rolls for
 *     an ITEM or LOCATION card tied to *this* book instead (never another
 *     author unlock) -- guaranteed if `boosted`, otherwise
 *     CARD_DROP_RATE_BASE baseline chance.
 * Swallows nothing itself -- the caller in app/api/reading/log/route.ts
 * wraps this in try/catch so a card-system failure can never block the
 * core finish-book flow (XP, streaks, challenges, event progress).
 */
export async function awardCollectibleForFinishedBook(
  supabase: SupabaseClient,
  userId: string,
  bookId: string,
  boosted: boolean
): Promise<CollectibleResult | null> {
  const { data: book } = await supabase.from("books").select("author, title, genre").eq("id", bookId).single();
  if (!book?.author) return null;

  const authorCard = await getOrCreateAuthorCard(supabase, book.author);

  const { data: existingAuthorOwnership } = await supabase
    .from("user_author_cards")
    .select("id")
    .eq("user_id", userId)
    .eq("card_id", authorCard.id)
    .maybeSingle();

  const isNewAuthor = !existingAuthorOwnership;

  if (isNewAuthor) {
    const grant = await grantCard(supabase, userId, authorCard);
    return {
      dropped: true,
      category: "author",
      card: authorCard,
      isNewAuthor: true,
      boosted,
      serialCode: grant.serialCode,
      quantity: grant.quantity,
    };
  }

  const dropped = boosted || Math.random() < CARD_DROP_RATE_BASE;
  if (!dropped) {
    return { dropped: false, category: "item", card: authorCard, isNewAuthor: false, boosted };
  }

  const category: "item" | "location" = Math.random() < 0.55 ? "item" : "location";
  const bookCard = await getOrCreateBookCollectible(supabase, {
    bookId,
    bookTitle: book.title,
    genre: book.genre,
    category,
    authorCard,
  });
  const grant = await grantCard(supabase, userId, bookCard);

  return {
    dropped: true,
    category,
    card: bookCard,
    isNewAuthor: false,
    boosted,
    serialCode: grant.serialCode,
    quantity: grant.quantity,
  };
}
