import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookStatus } from "./types";

export interface BookInput {
  title: string;
  author: string;
  cover_url?: string | null;
  description?: string;
}

export async function ensureBook(
  supabase: SupabaseClient,
  book: BookInput,
  addedBy: string
): Promise<string> {
  const { data: existing } = await supabase
    .from("books")
    .select("id")
    .eq("title", book.title)
    .eq("author", book.author)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created, error } = await supabase
    .from("books")
    .insert({
      title: book.title,
      author: book.author,
      cover_url: book.cover_url ?? null,
      description: book.description ?? null,
      added_by: addedBy,
    })
    .select("id")
    .single();

  if (error || !created) throw new Error(error?.message ?? "Failed to create book");
  return created.id;
}

export async function addToShelf(
  supabase: SupabaseClient,
  userId: string,
  bookId: string,
  status: BookStatus
) {
  const { data: existing } = await supabase
    .from("user_books")
    .select("id")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("user_books")
      .update({ status })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return existing.id;
  }

  const { data, error } = await supabase
    .from("user_books")
    .insert({
      user_id: userId,
      book_id: bookId,
      status,
      progress_percent: status === "reading" ? 0 : status === "finished" ? 100 : 0,
      started_at: status === "reading" ? new Date().toISOString() : null,
      finished_at: status === "finished" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to add to shelf");
  return data.id;
}
