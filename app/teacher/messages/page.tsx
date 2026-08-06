import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { MessagesInbox } from "@/components/messaging/MessagesInbox";

export default async function TeacherMessagesPage() {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== "teacher") redirect("/auth/login");

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
      <div className="mt-4">
        <MessagesInbox userId={user.id} variant="teacher" />
      </div>
    </div>
  );
}
