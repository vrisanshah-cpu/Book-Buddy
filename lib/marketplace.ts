export type MarketplaceCategory =
  | "books"
  | "school_supplies"
  | "tutoring"
  | "writing"
  | "editing"
  | "coaching"
  | "collectibles";

export type ListingCondition = "new" | "used" | "digital" | "service";

export const MARKETPLACE_CATEGORIES: MarketplaceCategory[] = [
  "books",
  "school_supplies",
  "tutoring",
  "writing",
  "editing",
  "coaching",
  "collectibles",
];

export const CATEGORY_LABELS: Record<MarketplaceCategory, string> = {
  books: "Used Books & Textbooks",
  school_supplies: "School Supplies",
  tutoring: "Tutoring",
  writing: "Original Writing",
  editing: "Editing Services",
  coaching: "Reading/Writing Coaching",
  collectibles: "Collectibles & Memorabilia",
};

export const CONDITION_LABELS: Record<ListingCondition, string> = {
  new: "New",
  used: "Used",
  digital: "Digital",
  service: "Service (no physical item)",
};

export function formatPriceCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export function isMarketplaceCategory(value: string): value is MarketplaceCategory {
  return (MARKETPLACE_CATEGORIES as string[]).includes(value);
}
