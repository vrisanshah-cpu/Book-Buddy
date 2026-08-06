import { getProfile, createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ShelfClient } from "@/components/kids/ShelfClient";
import { JoinClassroomCard } from "@/components/kids/JoinClassroomCard";
import { getEquippedCosmetics } from "@/lib/equipped-cosmetics";

const RARITY_BANNER_CLASS: Record<string, string> = {
  common: "from-emerald-400 to-teal-400",
  rare: "from-sky-400 to-indigo-400",
  epic: "from-fuchsia-400 to-purple-500",
  legendary: "from-amber-400 to-orange-500",
};

export default async function KidsShelfPage() {
  const { user, profile } = await getProfile();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();
  const cosmetics = await getEquippedCosmetics(supabase, profile);

  return (
    <>
      {cosmetics.shelfTheme && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-2xl bg-gradient-to-r ${
            RARITY_BANNER_CLASS[cosmetics.shelfTheme.rarity] ?? RARITY_BANNER_CLASS.common
          } px-4 py-2 text-sm font-semibold text-white shadow-md`}
        >
          <span aria-hidden="true" className="text-lg">
            {cosmetics.shelfTheme.icon_or_asset}
          </span>
          <span>{cosmetics.shelfTheme.name} shelf equipped</span>
        </div>
      )}
      <ShelfClient userId={user.id} />
      <JoinClassroomCard />
    </>
  );
}
