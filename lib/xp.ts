export const XP_REWARDS = {
  reading_session: 10,
  finish_book: 50,
  complete_challenge: 100,
  perfect_quiz: 75,
  booktok_post: 15,
  streak_7: 200,
} as const;

export function getLevel(xp: number) {
  if (xp >= 2000) return { level: 5, title: "Book Wizard" };
  if (xp >= 1000) return { level: 4, title: "Reading Legend" };
  if (xp >= 500) return { level: 3, title: "Chapter Champion" };
  if (xp >= 200) return { level: 2, title: "Story Explorer" };
  return { level: 1, title: "Bookworm" };
}

export function xpProgressInLevel(xp: number) {
  const thresholds = [0, 200, 500, 1000, 2000];
  const level = getLevel(xp).level;
  const min = thresholds[level - 1] ?? 0;
  const max = thresholds[level] ?? thresholds[thresholds.length - 1] + 500;
  const progress = max > min ? ((xp - min) / (max - min)) * 100 : 100;
  return Math.min(100, Math.max(0, progress));
}
