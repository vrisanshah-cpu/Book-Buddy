import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: profile } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return { error: NextResponse.json({ error: "Admin only" }, { status: 403 }) };

  return { error: null };
}

type AuthorRow = { id: string; display_name: string; email: string | null };
type ParentRow = { email: string | null };

// Supabase's generated types sometimes infer an embedded !fk join as
// array-only even for a to-one relationship, which makes TypeScript treat
// the non-array branch of Array.isArray(...) as unreachable (`never`) even
// though it's a real shape at runtime. The unknown-cast sidesteps that
// false narrowing instead of fighting the generated types.
function firstOrSelf<T>(value: T | T[] | null | undefined): T | null {
  const v = value as unknown as T | T[] | null;
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

/**
 * GET /api/admin/writing-submissions/top3-contacts?competitionId=<uuid>
 *
 * Admin-only, read-only. Returns contact details ONLY for submissions
 * already marked stage='top_3' in this specific competition — never a
 * bulk export of student/parent contact info, and never anything beyond
 * what's needed to coordinate a prize for a named winner. Parent contact
 * comes from the existing parent_child link (migration 001); a student
 * with no linked parent just gets an empty parentEmails array rather than
 * blocking the export.
 */
export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const competitionId = url.searchParams.get("competitionId");
  if (!competitionId) return NextResponse.json({ error: "Missing competitionId" }, { status: 400 });

  const admin = createAdminClient();

  const { data: winners, error: fetchError } = await admin
    .from("writing_submissions")
    .select("id, title, score, author:users!author_id(id, display_name, email)")
    .eq("competition_id", competitionId)
    .eq("stage", "top_3")
    .order("score", { ascending: false, nullsFirst: false });

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const rows = winners ?? [];
  const studentIds = rows
    .map((w) => firstOrSelf<AuthorRow>(w.author)?.id)
    .filter((id): id is string => Boolean(id));

  const { data: parentLinks } =
    studentIds.length > 0
      ? await admin
          .from("parent_child")
          .select("child_id, parent:users!parent_id(email)")
          .in("child_id", studentIds)
      : { data: [] };

  const parentEmailsByChild = new Map<string, string[]>();
  for (const link of parentLinks ?? []) {
    const parentEmail = firstOrSelf<ParentRow>(link.parent)?.email;
    if (!parentEmail) continue;
    const list = parentEmailsByChild.get(link.child_id) ?? [];
    list.push(parentEmail);
    parentEmailsByChild.set(link.child_id, list);
  }

  const contacts = rows.map((w) => {
    const author = firstOrSelf<AuthorRow>(w.author);
    return {
      submissionId: w.id,
      submissionTitle: w.title,
      score: w.score,
      studentId: author?.id ?? null,
      studentName: author?.display_name ?? "Unknown",
      studentEmail: author?.email ?? null,
      parentEmails: author?.id ? parentEmailsByChild.get(author.id) ?? [] : [],
    };
  });

  return NextResponse.json({ contacts });
}
