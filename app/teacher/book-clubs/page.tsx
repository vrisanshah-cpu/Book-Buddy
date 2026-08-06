import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { TeacherBookClubsClient } from "@/components/teacher/TeacherBookClubsClient";
import { GoogleAdsense } from "@/components/analytics/GoogleAdsense";

export default async function TeacherBookClubsPage() {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== "teacher") redirect("/auth/login");
  return (
    <>
      <GoogleAdsense />
      <TeacherBookClubsClient teacherId={user.id} />
    </>
  );
}
