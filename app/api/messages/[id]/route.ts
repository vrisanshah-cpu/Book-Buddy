import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { containsProfanity } from "@/lib/profanity-filter";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: messages, error } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at, read_by")
    .eq("conversation_id", params.id)
    .order("created_at", { ascending: true });

  if (error) {
    // RLS blocks non-participants — surfaces as an empty/errored read.
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  await supabase.rpc("mark_messages_read", { p_conversation_id: params.id });

  return NextResponse.json({ messages: messages ?? [] });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { body } = await request.json();
  const trimmed = (body ?? "").toString().trim();

  if (!trimmed || trimmed.length > 2000) {
    return NextResponse.json({ error: "Message must be 1-2000 characters" }, { status: 400 });
  }
  if (containsProfanity(trimmed)) {
    return NextResponse.json({ error: "That message isn't allowed — try rephrasing it." }, { status: 400 });
  }

  const { data: message, error } = await supabase
    .from("messages")
    .insert({ conversation_id: params.id, sender_id: user.id, body: trimmed, read_by: [user.id] })
    .select("id, sender_id, body, created_at, read_by")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ message });
}
