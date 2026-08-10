import { redirect } from "next/navigation";
import { getProfile, createClient } from "@/lib/supabase/server";
import { AccessibilitySettingsForm } from "@/components/kids/AccessibilitySettingsForm";
import { OfflineReadingInfoCard } from "@/components/kids/OfflineReadingInfoCard";
import { InstitutionCodeForm } from "@/components/kids/InstitutionCodeForm";

export default async function KidsSettingsPage() {
  const { user, profile } = await getProfile();
  if (!user) redirect("/auth/login");

  let linkedInstitution: {
    name: string;
    type: "school" | "company";
    logo_url: string | null;
    welcome_message: string | null;
  } | null = null;

  if (profile?.institution_id) {
    const supabase = await createClient();
    const { data: institution } = await supabase
      .from("institutions")
      .select("name, type, logo_url, welcome_message")
      .eq("id", profile.institution_id)
      .maybeSingle();
    linkedInstitution = institution ?? null;
  }

  return (
    <div>
      <h1 className="font-kids-display text-2xl font-bold text-slate-900">Settings</h1>
      <div className="mt-4 space-y-4">
        <OfflineReadingInfoCard />
        <AccessibilitySettingsForm />
        <InstitutionCodeForm initialInstitution={linkedInstitution} />
      </div>
    </div>
  );
}
