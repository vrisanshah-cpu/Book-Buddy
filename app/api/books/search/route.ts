import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchOpenLibrary, searchByAuthor } from "@/lib/open-library";
import { crossReferenceInstitutionCatalog } from "@/lib/institution-catalog";
import { getEffectiveBlocksForKid, filterBlockedBooks } from "@/lib/content-blocks";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const type = searchParams.get("type") === "author" ? "author" : "title";
  if (!query) return NextResponse.json({ error: "Missing q" }, { status: 400 });

  const [results, blocks, profile] = await Promise.all([
    type === "author" ? searchByAuthor(query) : searchOpenLibrary(query),
    getEffectiveBlocksForKid(supabase, user.id),
    supabase.from("users").select("institution_id").eq("id", user.id).single(),
  ]);

  const filtered = filterBlockedBooks(blocks, results);

  const institutionMatches = await crossReferenceInstitutionCatalog(
    supabase,
    profile.data?.institution_id ?? null,
    filtered.map((b) => b.title)
  );

  const withAvailability = filtered.map((book) => ({
    ...book,
    institutionAvailability: institutionMatches.get(book.title) ?? null,
  }));

  return NextResponse.json({ results: withAvailability });
}
