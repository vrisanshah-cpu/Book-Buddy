import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { MessagesInbox } from "@/components/messaging/MessagesInbox";

export default async function ParentMessagesPage() {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== "parent") redirect("/auth/login");

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
      <div className="mt-4">
        <MessagesInbox userId={user.id} variant="parent" />
      </div>
    </div>
  );
}
