import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { AccessibilitySettingsForm } from "@/components/kids/AccessibilitySettingsForm";

export default async function KidsSettingsPage() {
  const { user } = await getProfile();
  if (!user) redirect("/auth/login");

  return (
    <div>
      <h1 className="font-kids-display text-2xl font-bold text-slate-900">Settings</h1>
      <div className="mt-4">
        <AccessibilitySettingsForm />
      </div>
    </div>
  );
}
