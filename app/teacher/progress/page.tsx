import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { TeacherProgressClient } from "@/components/teacher/TeacherProgressClient";
import { GoogleAdsense } from "@/components/analytics/GoogleAdsense";

export default async function TeacherProgressPage() {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== "teacher") redirect("/auth/login");
  return (
    <>
      <GoogleAdsense />
      <TeacherProgressClient teacherId={user.id} />
    </>
  );
}
