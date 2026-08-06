import type { SupabaseClient } from "@supabase/supabase-js";

export interface Contact {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: "kid" | "parent" | "teacher";
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of items) map.set(item.id, item);
  return Array.from(map.values());
}

type RawUser = { id: string; display_name: string; avatar_url: string | null };

function unwrap(value: RawUser | RawUser[] | null): RawUser | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

/**
 * Who a parent or teacher is allowed to START a new conversation with.
 * Kids never get a "start new conversation" list — by design they can
 * only reply within threads a parent/teacher already started (see
 * create_conversation() in migration 019, which also refuses any
 * kid-to-kid pair server-side regardless of what the client sends).
 */
export async function getEligibleContacts(
  supabase: SupabaseClient,
  userId: string,
  role: string
): Promise<Contact[]> {
  if (role === "parent") {
    const { data: links } = await supabase
      .from("parent_child")
      .select("child:users!child_id(id, display_name, avatar_url)")
      .eq("parent_id", userId);

    const children = dedupeById(
      (links ?? []).map((l) => unwrap(l.child as RawUser | RawUser[] | null)).filter((c): c is RawUser => Boolean(c))
    );

    const childIds = children.map((c) => c.id);
    let teachers: RawUser[] = [];
    if (childIds.length > 0) {
      const { data: teacherLinks } = await supabase
        .from("teacher_student")
        .select("teacher:users!teacher_id(id, display_name, avatar_url)")
        .in("student_id", childIds);
      teachers = dedupeById(
        (teacherLinks ?? [])
          .map((t) => unwrap(t.teacher as RawUser | RawUser[] | null))
          .filter((t): t is RawUser => Boolean(t))
      );
    }

    return [
      ...children.map((c) => ({ ...c, role: "kid" as const })),
      ...teachers.map((t) => ({ ...t, role: "teacher" as const })),
    ];
  }

  if (role === "teacher") {
    const { data: studentLinks } = await supabase
      .from("teacher_student")
      .select("student:users!student_id(id, display_name, avatar_url)")
      .eq("teacher_id", userId);

    const kids = dedupeById(
      (studentLinks ?? [])
        .map((s) => unwrap(s.student as RawUser | RawUser[] | null))
        .filter((s): s is RawUser => Boolean(s))
    );

    const kidIds = kids.map((k) => k.id);
    let parents: RawUser[] = [];
    if (kidIds.length > 0) {
      const { data: parentLinks } = await supabase
        .from("parent_child")
        .select("parent:users!parent_id(id, display_name, avatar_url)")
        .in("child_id", kidIds);
      parents = dedupeById(
        (parentLinks ?? [])
          .map((p) => unwrap(p.parent as RawUser | RawUser[] | null))
          .filter((p): p is RawUser => Boolean(p))
      );
    }

    return [
      ...kids.map((k) => ({ ...k, role: "kid" as const })),
      ...parents.map((p) => ({ ...p, role: "parent" as const })),
    ];
  }

  return [];
}
