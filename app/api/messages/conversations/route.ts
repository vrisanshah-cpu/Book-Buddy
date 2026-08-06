import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEligibleContacts } from "@/lib/messaging-contacts";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: myParticipantRows } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", user.id);

  const conversationIds = (myParticipantRows ?? []).map((r) => r.conversation_id as string);

  if (conversationIds.length === 0) {
    return NextResponse.json({ conversations: [] });
  }

  const { data: allParticipants } = await supabase
    .from("conversation_participants")
    .select("conversation_id, user:users!user_id(id, display_name, avatar_url, role)")
    .in("conversation_id", conversationIds);

  const { data: recentMessages } = await supabase
    .from("messages")
    .select("conversation_id, sender_id, body, created_at, read_by")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  const conversations = conversationIds.map((id) => {
    const other = (allParticipants ?? [])
      .filter((p) => p.conversation_id === id)
      .map((p) => (Array.isArray(p.user) ? p.user[0] : p.user))
      .find((u) => u && u.id !== user.id);

    const messagesForConvo = (recentMessages ?? []).filter((m) => m.conversation_id === id);
    const lastMessage = messagesForConvo[0] ?? null;
    const unreadCount = messagesForConvo.filter(
      (m) => m.sender_id !== user.id && !(m.read_by as string[]).includes(user.id)
    ).length;

    return { id, otherUser: other ?? null, lastMessage, unreadCount };
  });

  conversations.sort((a, b) => {
    const at = a.lastMessage?.created_at ?? "";
    const bt = b.lastMessage?.created_at ?? "";
    return bt.localeCompare(at);
  });

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  const contacts = await getEligibleContacts(supabase, user.id, profile?.role ?? "");

  return NextResponse.json({ conversations, contacts });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { otherUserId } = await request.json();
  if (!otherUserId) return NextResponse.json({ error: "Missing otherUserId" }, { status: 400 });

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();

  // Only a parent/teacher may originate a new conversation. A kid can
  // still be handed a conversation id (they're one of the two
  // participants), but never initiates one themselves.
  if (profile?.role === "kid") {
    return NextResponse.json({ error: "Ask your parent or teacher to start a conversation" }, { status: 403 });
  }

  const contacts = await getEligibleContacts(supabase, user.id, profile?.role ?? "");
  if (!contacts.some((c) => c.id === otherUserId)) {
    return NextResponse.json({ error: "You can't message that person" }, { status: 403 });
  }

  const { data: conversationId, error } = await supabase.rpc("create_conversation", {
    p_participant_ids: [user.id, otherUserId],
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ conversationId });
}
