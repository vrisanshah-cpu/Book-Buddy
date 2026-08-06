import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface BookRow {
  isbn: string;
  title: string;
  author: string;
  available_copies?: number;
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: profile } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return { supabase, error: NextResponse.json({ error: "Admin only" }, { status: 403 }) };

  return { supabase, error: null };
}

export async function GET() {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { data: institutions } = await supabase
    .from("institutions")
    .select("id, name, code, type, created_at")
    .order("created_at", { ascending: false });

  const { data: bookCounts } = await supabase.from("institution_books").select("institution_id");
  const counts = new Map<string, number>();
  for (const row of bookCounts ?? []) {
    counts.set(row.institution_id, (counts.get(row.institution_id) ?? 0) + 1);
  }

  return NextResponse.json({
    institutions: (institutions ?? []).map((i) => ({ ...i, bookCount: counts.get(i.id) ?? 0 })),
  });
}

export async function POST(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();

  if (body.action === "create_institution") {
    const { name, code, type } = body;
    if (!name?.trim() || !code?.trim() || !["school", "company"].includes(type)) {
      return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
    }
    const { data: institution, error: insertError } = await supabase
      .from("institutions")
      .insert({ name: name.trim(), code: code.trim(), type })
      .select()
      .single();
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });
    return NextResponse.json({ institution });
  }

  if (body.action === "upload_books") {
    const { institutionId, books } = body as { institutionId: string; books: BookRow[] };
    if (!institutionId || !Array.isArray(books) || books.length === 0) {
      return NextResponse.json({ error: "Missing institutionId or books" }, { status: 400 });
    }

    const rows = books
      .filter((b) => b.isbn?.trim() && b.title?.trim() && b.author?.trim())
      .map((b) => ({
        institution_id: institutionId,
        isbn: b.isbn.trim(),
        title: b.title.trim(),
        author: b.author.trim(),
        available_copies: Number.isFinite(b.available_copies) ? Number(b.available_copies) : 1,
      }));

    if (rows.length === 0) {
      return NextResponse.json({ error: "No valid rows (each needs isbn, title, author)" }, { status: 400 });
    }

    const { error: upsertError } = await supabase
      .from("institution_books")
      .upsert(rows, { onConflict: "institution_id,isbn" });

    if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 400 });

    return NextResponse.json({ ok: true, uploaded: rows.length });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
