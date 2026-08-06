import type { SupabaseClient } from "@supabase/supabase-js";

export interface InstitutionMatch {
  institutionName: string;
  institutionType: "school" | "company";
  availableCopies: number;
}

/**
 * Matches by normalized title only, not ISBN — Open Library search
 * results (lib/open-library.ts) return title/author/cover/description
 * but no ISBN, so an ISBN-based lookup isn't possible with the data
 * actually available at search time. Good enough for a "likely available
 * at your school/company" badge without an ISBN reconciliation step.
 *
 * Fetches the institution's whole catalog rather than filtering
 * server-side by each title, since institution_books.title casing isn't
 * guaranteed to match Open Library's — institution catalogs are expected
 * to be one school/company's holdings (hundreds, not millions), so this
 * stays cheap.
 */
export async function crossReferenceInstitutionCatalog(
  supabase: SupabaseClient,
  institutionId: string | null,
  titles: string[]
): Promise<Map<string, InstitutionMatch>> {
  const result = new Map<string, InstitutionMatch>();
  if (!institutionId || titles.length === 0) return result;

  const { data: institution } = await supabase
    .from("institutions")
    .select("name, type")
    .eq("id", institutionId)
    .maybeSingle();
  if (!institution) return result;

  const { data: catalog } = await supabase
    .from("institution_books")
    .select("title, available_copies")
    .eq("institution_id", institutionId);

  const byNormalizedTitle = new Map<string, number>();
  for (const row of catalog ?? []) {
    byNormalizedTitle.set(row.title.trim().toLowerCase(), row.available_copies);
  }

  for (const title of titles) {
    const copies = byNormalizedTitle.get(title.trim().toLowerCase());
    if (copies !== undefined) {
      result.set(title, { institutionName: institution.name, institutionType: institution.type, availableCopies: copies });
    }
  }

  return result;
}
