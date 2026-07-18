import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { CollectionClient } from "@/components/kids/CollectionClient";

export default async function KidsCollectionPage() {
  const { user } = await getProfile();
  if (!user) redirect("/auth/login");
  return <CollectionClient userId={user.id} />;
}
