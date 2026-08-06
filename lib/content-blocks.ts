import type { SupabaseClient } from "@supabase/supabase-js";

export type ContentBlockType = "book" | "author" | "topic_keyword";

export interface ContentBlockRow {
  block_type: ContentBlockType;
  book_id: string | null;
  author_name: string | null;
  keyword: string | null;
}

export interface EffectiveBlocks {
  blockedBookIds: Set<string>;
  blockedAuthors: Set<string>; // lowercased
  blockedKeywords: string[]; // original casing, for prompt injection + substring matching
}

/**
 * Loads every content_blocks row that currently applies to `kidId` — both
 * blocks set directly on the child, and blocks set on any classroom
 * they're in — and shapes it into fast-lookup sets.
 *
 * Works with either the kid's own RLS-scoped client (server or browser)
 * or an admin/service-role client. Classroom membership is resolved
 * explicitly and folded into the query rather than relied on via RLS,
 * because when this is called with the admin client (e.g. a parent
 * adding a book to their child's shelf — see app/api/books/shelf) RLS is
 * bypassed entirely, so the scoping has to happen here.
 */
export async function getEffectiveBlocksForKid(
  supabase: SupabaseClient,
  kidId: string
): Promise<EffectiveBlocks> {
  const empty: EffectiveBlocks = {
    blockedBookIds: new Set(),
    blockedAuthors: new Set(),
    blockedKeywords: [],
  };
  if (!kidId) return empty;

  const { data: memberships } = await supabase
    .from("teacher_student")
    .select("classroom_id")
    .eq("student_id", kidId)
    .not("classroom_id", "is", null);

  const classroomIds = (memberships ?? [])
    .map((m: { classroom_id: string | null }) => m.classroom_id)
    .filter((id: string | null): id is string => Boolean(id));

  const orParts = [`and(scope.eq.child,child_id.eq.${kidId})`];
  if (classroomIds.length > 0) {
    orParts.push(`and(scope.eq.classroom,classroom_id.in.(${classroomIds.join(",")}))`);
  }

  const { data, error } = await supabase
    .from("content_blocks")
    .select("block_type, book_id, author_name, keyword")
    .or(orParts.join(","));

  if (error || !data) return empty;

  const blockedBookIds = new Set<string>();
  const blockedAuthors = new Set<string>();
  const blockedKeywords: string[] = [];

  for (const row of data as ContentBlockRow[]) {
    if (row.block_type === "book" && row.book_id) blockedBookIds.add(row.book_id);
    if (row.block_type === "author" && row.author_name) blockedAuthors.add(row.author_name.trim().toLowerCase());
    if (row.block_type === "topic_keyword" && row.keyword) blockedKeywords.push(row.keyword.trim());
  }

  return { blockedBookIds, blockedAuthors, blockedKeywords };
}

/**
 * True if this book trips any of the kid's blocks — by internal book id
 * (when known, e.g. featured books), by author name, or by a topic
 * keyword appearing in the title. All fields are optional so this works
 * for internal Books rows, Gemini recommendations, and Open Library
 * search results alike.
 */
export function isBookBlocked(
  blocks: EffectiveBlocks,
  book: { id?: string | null; author?: string | null; title?: string | null }
): boolean {
  if (book.id && blocks.blockedBookIds.has(book.id)) return true;
  if (book.author && blocks.blockedAuthors.has(book.author.trim().toLowerCase())) return true;
  if (book.title) {
    const haystack = book.title.toLowerCase();
    if (blocks.blockedKeywords.some((k) => k && haystack.includes(k.toLowerCase()))) return true;
  }
  return false;
}

/** Convenience filter for a list of book-like objects. */
export function filterBlockedBooks<T extends { id?: string | null; author?: string | null; title?: string | null }>(
  blocks: EffectiveBlocks,
  books: T[]
): T[] {
  return books.filter((b) => !isBookBlocked(blocks, b));
}

/** Short, plain-language instruction lines for injecting into an AI system prompt. */
export function describeBlocksForPrompt(blocks: EffectiveBlocks): string[] {
  const lines: string[] = [];
  if (blocks.blockedAuthors.size > 0) {
    lines.push(`Never discuss, recommend, or quote these authors or their books: ${Array.from(blocks.blockedAuthors).join(", ")}.`);
  }
  if (blocks.blockedKeywords.length > 0) {
    lines.push(`Never discuss these topics, even if asked directly: ${blocks.blockedKeywords.join(", ")}.`);
  }
  return lines;
}
