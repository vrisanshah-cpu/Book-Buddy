/**
 * Catches cruelty that doesn't contain profanity -- "nobody likes this,"
 * "you're so stupid," "shut up" -- so we can send the small subset of
 * genuinely ambiguous comments to Gemini for moderation, instead of every
 * comment. The profanity filter (lib/profanity-filter.ts) should always
 * run first and reject outright on a match; this only decides whether a
 * profanity-clean comment still needs a second look.
 *
 * Deliberately biased toward over-flagging: false positives cost one
 * extra Gemini call, false negatives let something unkind through to a
 * child. When in doubt, flag it.
 */

const MEAN_PATTERNS = [
  /\bstupid\b/i,
  /\bdumb\b/i,
  /\bugly\b/i,
  /\bidiot\b/i,
  /\bloser\b/i,
  /\bweird(o)?\b/i,
  /\blame\b/i,
  /\bsuck(s|ed)?\b/i,
  /\bhate (you|this|it)\b/i,
  /\bshut up\b/i,
  /\bnobody (likes|cares)\b/i,
  /\bno one (likes|cares)\b/i,
  /\bboring\b/i,
  /\bworst\b/i,
  /\bcringe\b/i,
];

function hasExcessiveCaps(text: string): boolean {
  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 8) return false;
  const upper = letters.replace(/[^A-Z]/g, "");
  return upper.length / letters.length > 0.6;
}

function hasAggressivePunctuation(text: string): boolean {
  return /[!?]{3,}/.test(text);
}

export function needsModerationReview(text: string): boolean {
  return (
    MEAN_PATTERNS.some((pattern) => pattern.test(text)) ||
    hasExcessiveCaps(text) ||
    hasAggressivePunctuation(text)
  );
}
