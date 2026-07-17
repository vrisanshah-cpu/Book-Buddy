export type UserRole = "kid" | "parent" | "teacher";

export type BookStatus = "reading" | "finished" | "want_to_read";

export type ChallengeType =
  | "reading_streak"
  | "books_finished"
  | "minutes_read"
  | "quiz_score";

export interface UserProfile {
  id: string;
  email: string | null;
  role: UserRole;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  age: number | null;
  xp: number;
  school_name: string | null;
  grade_levels: string | null;
  is_admin: boolean;
  equipped_title_id: string | null;
  created_at: string;
}

export interface ChildProfileInput {
  username: string;
  displayName: string;
  age: number;
  avatarUrl?: string;
}