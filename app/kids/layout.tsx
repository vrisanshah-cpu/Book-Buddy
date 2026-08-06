import { KidsNav } from "@/components/kids/KidsNav";
import { OfflineBanner } from "@/components/kids/OfflineBanner";
import { AccessibilityProvider, type TextScale } from "@/components/kids/AccessibilityProvider";
import { PushPrompt } from "@/components/notifications/PushPrompt";
import { getProfile } from "@/lib/supabase/server";

export default async function KidsLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getProfile();

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
          <div className="mt-4">{children}</div>
        </main>
      </div>
    </AccessibilityProvider>
  );
}
