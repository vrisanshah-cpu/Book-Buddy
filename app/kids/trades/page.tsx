import { redirect } from "next/navigation";
import { getProfile, createClient } from "@/lib/supabase/server";
import { TradesClient } from "@/components/kids/TradesClient";

export default async function TradesPage() {
  const { user } = await getProfile();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();

  const { data: ownedRows } = await supabase
    .from("user_shop_items")
    .select("item_id, quantity, item:shop_items(id, name, icon_or_asset, rarity, category)")
    .eq("user_id", user.id)
    .gt("quantity", 0);

  // Classmates: anyone who shares a classroom with this kid, via
  // teacher_student (same pattern EventsClient-adjacent code already
  // uses for "which classroom is this kid in").
  const { data: myClassrooms } = await supabase
    .from("teacher_student")
    .select("classroom_id")
    .eq("student_id", user.id)
    .not("classroom_id", "is", null);
  const classroomIds = (myClassrooms ?? []).map((c) => c.classroom_id).filter(Boolean);

  let classmates: { id: string; display_name: string }[] = [];
  if (classroomIds.length > 0) {
    const { data: rows } = await supabase
      .from("teacher_student")
      .select("student:users!student_id(id, display_name)")
      .in("classroom_id", classroomIds)
      .neq("student_id", user.id);
    const seen = new Map<string, { id: string; display_name: string }>();
    for (const r of rows ?? []) {
      const s = Array.isArray(r.student) ? r.student[0] : r.student;
      if (s) seen.set(s.id, s);
    }
    classmates = Array.from(seen.values());
  }

  const { data: allItems } = await supabase.from("shop_items").select("id, name, icon_or_asset, rarity, category");

  return (
    <TradesClient
      currentUserId={user.id}
      myItems={(ownedRows ?? []).map((r) => ({
        itemId: r.item_id,
        quantity: r.quantity,
        item: Array.isArray(r.item) ? r.item[0] : r.item,
      }))}
      allItems={allItems ?? []}
      classmates={classmates}
    />
  );
}
