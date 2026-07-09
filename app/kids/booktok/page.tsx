import { getProfile } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BookTokClient } from "@/components/kids/BookTokClient";

export default async function BookTokPage() {
  const { user } = await getProfile();
  if (!user) redirect("/auth/login");
  return <BookTokClient userId={user.id} />;
}
