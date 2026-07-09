import { getProfile } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BookClubClient } from "@/components/kids/BookClubClient";

export default async function BookClubPage() {
  const { user } = await getProfile();
  if (!user) redirect("/auth/login");
  return <BookClubClient userId={user.id} />;
}
