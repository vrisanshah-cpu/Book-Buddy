import { KidsNav } from "@/components/kids/KidsNav";
import { OfflineBanner } from "@/components/kids/OfflineBanner";
import { AccessibilityProvider, type TextScale } from "@/components/kids/AccessibilityProvider";
import { PushPrompt } from "@/components/notifications/PushPrompt";
import { StreakFreezeNotice } from "@/components/kids/StreakFreezeNotice";
import { getProfile, createClient } from "@/lib/supabase/server";
import { checkAndApplyStreakFreeze } from "@/lib/reading-log";

export default async function KidsLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getProfile();

  let streakFreezeApplied = false;
  if (user) {
    const supabase = await createClient();
    const result = await checkAndApplyStreakFreeze(supabase, user.id);
    streakFreezeApplied = result.applied;
  }

  return (
    <AccessibilityProvider
      userId={user?.id ?? ""}
      initialDyslexiaFont={Boolean(profile?.dyslexia_font)}
      initialTextScale={(profile?.text_scale as TextScale) ?? "normal"}
    >
      <div className="min-h-screen bg-kids-bg font-kids">
        <KidsNav />
        <OfflineBanner />
        <main className="mx-auto max-w-5xl px-4 py-8">
          <PushPrompt />
          <StreakFreezeNotice applied={streakFreezeApplied} />
          <div className="mt-4">{children}</div>
        </main>
      </div>
    </AccessibilityProvider>
  );
}
