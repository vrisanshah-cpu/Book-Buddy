import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { AdminWritingJudgeClient } from "@/components/admin/AdminWritingJudgeClient";

export default async function AdminWritingSubmissionsPage() {
  const { user, profile } = await getProfile();
  if (!user || !profile?.is_admin) redirect("/auth/login");

  return <AdminWritingJudgeClient />;
}
