import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { AdminPostComposer } from "@/components/admin/AdminPostComposer";

export default async function AdminPostsPage() {
  const { user, profile } = await getProfile();
  if (!user || !profile?.is_admin) redirect("/auth/login");
  return <AdminPostComposer />;
}