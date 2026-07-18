import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { joinEvent } from "@/lib/weekend-events";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: event } = await supabase
    .from("weekend_events")
    .select("id, status")
    .eq("id", params.id)
    .maybeSingle();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (event.status === "closed") {
    return NextResponse.json({ error: "This event has already ended" }, { status: 400 });
  }

  const { error } = await joinEvent(supabase, user.id, params.id);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, joined: true });
}
