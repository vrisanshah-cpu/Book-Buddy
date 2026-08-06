import { redirect, notFound } from "next/navigation";
import { getProfile, createClient } from "@/lib/supabase/server";
import { EventDetailClient } from "@/components/kids/EventDetailClient";

export default async function ClassroomEventDetailPage({ params }: { params: { id: string } }) {
  const { user } = await getProfile();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();

  const { data: event } = await supabase
    .from("classroom_events")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!event) notFound();

  const { data: leaderboard } = await supabase.rpc("get_classroom_event_leaderboard", {
    p_event_id: params.id,
  });

  const { data: myEntry } = await supabase
    .from("classroom_event_entries")
    .select("id, progress, rank")
    .eq("event_id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <EventDetailClient
      event={event}
      leaderboard={leaderboard ?? []}
      hasJoined={Boolean(myEntry)}
      myProgress={myEntry?.progress ?? 0}
      joinUrl={`/api/classroom-events/${params.id}/join`}
    />
  );
}
