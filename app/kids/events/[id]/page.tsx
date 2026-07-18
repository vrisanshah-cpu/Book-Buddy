import { redirect, notFound } from "next/navigation";
import { getProfile, createClient } from "@/lib/supabase/server";
import { EventDetailClient } from "@/components/kids/EventDetailClient";

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const { user } = await getProfile();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();

  const { data: event } = await supabase
    .from("weekend_events")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!event) notFound();

  const { data: leaderboard } = await supabase.rpc("get_event_leaderboard", {
    p_event_id: params.id,
  });

  const { data: myEntry } = await supabase
    .from("event_entries")
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
    />
  );
}
