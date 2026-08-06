import { redirect } from "next/navigation";
import { getProfile, createClient } from "@/lib/supabase/server";
import { getLevel, xpProgressInLevel } from "@/lib/xp";
import { ActivateBoosterButton } from "@/components/kids/ActivateBoosterButton";

export default async function KidsProfilePage() {
  const { user, profile } = await getProfile();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();

  const xp = profile?.xp ?? 0;
  const { level, title } = getLevel(xp);
  const progress = xpProgressInLevel(xp);

  const { data: transactions } = await supabase
    .from("xp_transactions")
    .select("id, amount, reason, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const { data: freezeEvents } = await supabase
    .from("streak_freeze_events")
    .select("id, frozen_date, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: inventory } = await supabase
    .from("user_shop_items")
    .select("quantity, item:shop_items(code)")
    .eq("user_id", user.id);

  type InventoryRow = { quantity: number; item: { code: string } | { code: string }[] | null };
  const inventoryRows = (inventory ?? []) as InventoryRow[];

  function ownedQuantity(code: string): number {
    const row = inventoryRows.find((i) => (Array.isArray(i.item) ? i.item[0]?.code : i.item?.code) === code);
    return row?.quantity ?? 0;
  }

  const freezesOwned = ownedQuantity("streak_freeze");
  const boostersOwned = ownedQuantity("booster_2x_24h");

  const boosterActive = Boolean(
    profile?.active_xp_booster_until && profile.active_xp_booster_until > new Date().toISOString()
  );

  return (
    <div>
      <h1 className="font-kids-display text-2xl font-bold text-slate-900">Your Profile</h1>

      <div className="mt-4 rounded-2xl bg-white p-5 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Level {level}</p>
            <p className="font-kids-display text-xl font-bold text-kids-purple">{title}</p>
          </div>
          <span className="rounded-full bg-kids-yellow px-3 py-1.5 text-sm font-bold text-slate-900">✨ {xp} XP</span>
        </div>
        <div
          className="mt-3 h-3 overflow-hidden rounded-full bg-violet-100"
          role="progressbar"
          aria-label="Level progress"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-kids-purple" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-md">
          <p className="font-semibold text-slate-900">🧊 Streak freezes</p>
          <p className="mt-1 text-sm text-slate-500">
            You own <span className="font-semibold text-slate-900">{freezesOwned}</span>. We&apos;ll use one
            automatically if you ever miss a day.
          </p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-md">
          <p className="font-semibold text-slate-900">⚡ XP Booster</p>
          {boosterActive ? (
            <p className="mt-1 text-sm font-semibold text-emerald-600">Active — earning 2x XP right now!</p>
          ) : (
            <div className="mt-2">
              <ActivateBoosterButton ownedCount={boostersOwned} />
            </div>
          )}
        </div>
      </div>

      {freezeEvents && freezeEvents.length > 0 && (
        <div className="mt-4 rounded-2xl bg-white p-5 shadow-md">
          <p className="font-semibold text-slate-900">Streak freeze history</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {freezeEvents.map((e) => (
              <li key={e.id}>🧊 Covered {e.frozen_date}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 rounded-2xl bg-white p-5 shadow-md">
        <p className="font-semibold text-slate-900">XP spending log</p>
        {!transactions || transactions.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">Nothing spent yet — visit the Shop!</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-50">
            {transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-700">{t.reason}</span>
                <span className={`font-semibold ${t.amount < 0 ? "text-red-500" : "text-emerald-600"}`}>
                  {t.amount > 0 ? "+" : ""}
                  {t.amount} XP
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
