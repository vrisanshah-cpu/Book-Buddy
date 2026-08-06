import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { MessagesInbox } from "@/components/messaging/MessagesInbox";

export default async function KidsMessagesPage() {
  const { user } = await getProfile();
  if (!user) redirect("/auth/login");

  return (
    <div>
      <h1 className="font-kids-display text-2xl font-bold text-slate-900">Messages</h1>
      <div className="mt-4">
        <MessagesInbox userId={user.id} variant="kids" />
      </div>
    </div>
  );
}
