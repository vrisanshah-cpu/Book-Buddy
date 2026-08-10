import { SLOT_RENDER_ORDER, type CosmeticItem } from "@/lib/character";

/**
 * Every cosmetic image is a transparent PNG on the same 600x800 canvas
 * (see migration 027's header comment for the full art spec) — so
 * rendering is just stacking <img> tags in z-order, no per-item
 * positioning math needed. `equipped` only needs one entry per slot that
 * actually has something equipped; empty slots simply render nothing.
 */
export function CharacterCanvas({
  equipped,
  className = "",
}: {
  equipped: Partial<Record<string, CosmeticItem | null>>;
  className?: string;
}) {
  return (
    <div className={`relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-slate-100 ${className}`}>
      {SLOT_RENDER_ORDER.map((slot) => {
        const item = equipped[slot];
        if (!item) return null;
        return (
          // eslint-disable-next-line @next/next/no-img-element -- fixed-canvas cosmetic art, not a content image next/image needs to optimize
          <img
            key={slot}
            src={item.image_url}
            alt={slot === "body" || slot === "hair" || slot === "outfit" ? "" : item.name}
            className="absolute inset-0 h-full w-full object-contain"
            draggable={false}
          />
        );
      })}
    </div>
  );
}
