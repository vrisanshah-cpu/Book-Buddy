import { getProfile } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ShelfClient } from "@/components/kids/ShelfClient";
import { JoinClassroomCard } from "@/components/kids/JoinClassroomCard";

export default async function KidsShelfPage() {
  const { user } = await getProfile();
  if (!user) redirect("/auth/login");

  return (
    <>
      <ShelfClient userId={user.id} />
      <JoinClassroomCard />
    </>
  );
}
