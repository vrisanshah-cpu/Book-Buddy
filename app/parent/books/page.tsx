import { redirect } from "next/navigation";
import { getProfile, createClient } from "@/lib/supabase/server";
import { ParentBooksClient } from "@/components/parent/ParentBooksClient";

export default async function ParentBooksPage() {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== "parent") redirect("/auth/login");

  const supabase = await createClient();
  const { data: links } = await supabase
    .from("parent_child")
    .select("child:users!child_id(id, display_name)")
    .eq("parent_id", user.id);

  const linkedChildProfiles = (links ?? []).map((l) => {
    const childData = Array.isArray(l.child) ? l.child[0] : l.child;
    return childData as { id: string; display_name: string };
  });

  return <ParentBooksClient initialChildren={linkedChildProfiles} />;
}