import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { AccessibilitySettingsForm } from "@/components/kids/AccessibilitySettingsForm";
import { OfflineReadingInfoCard } from "@/components/kids/OfflineReadingInfoCard";

export default async function KidsSettingsPage() {
  const { user } = await getProfile();
  if (!user) redirect("/auth/login");

  return (
    <div>
      <h1 className="font-kids-display text-2xl font-bold text-slate-900">Settings</h1>
      <div className="mt-4 space-y-4">
        <OfflineReadingInfoCard />
        <AccessibilitySettingsForm />
      </div>
    </div>
  );
}
