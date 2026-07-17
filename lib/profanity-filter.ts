const BLOCKED_WORDS = [
    "fuck", "shit", "bitch", "asshole", "dick", "pussy", "cunt",
    "nigger", "nigga", "fag", "retard", "whore", "slut", "cock",
    "porn", "rape", "nazi",
  ];
  
  export function containsProfanity(text: string): boolean {
    const normalized = text.toLowerCase().replace(/[^a-z0-9]/g, "");
    return BLOCKED_WORDS.some((word) => normalized.includes(word));
  }