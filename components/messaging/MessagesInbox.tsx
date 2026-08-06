"use client";

import { useEffect, useState } from "react";

interface OtherUser {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
}
interface LastMessage {
  sender_id: string;
  body: string;
  created_at: string;
}
interface ConversationSummary {
  id: string;
  otherUser: OtherUser | null;
  lastMessage: LastMessage | null;
  unreadCount: number;
}
interface Contact {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
}
interface Message {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

const ACCENT: Record<"kids" | "parent" | "teacher", string> = {
  kids: "bg-kids-purple text-white",
  parent: "bg-parent-primary text-white",
  teacher: "bg-teacher-primary text-white",
};

/**
 * Two-pane inbox (conversation list + thread), used as-is on the kid,
 * parent, and teacher /messages pages — only `variant` changes (accent
 * color). Kids never see "+ New" (the API refuses a kid-initiated
 * conversation anyway — see app/api/messages/conversations/route.ts —
 * but hiding it here avoids a confusing error for something that's never
 * allowed).
 */
export function MessagesInbox({ userId, variant }: { userId: string; variant: "kids" | "parent" | "teacher" }) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [showNewConvo, setShowNewConvo] = useState(false);

  useEffect(() => {
    void loadConversations();
  }, []);

  useEffect(() => {
    if (selectedId) void loadThread(selectedId);
  }, [selectedId]);

  async function loadConversations() {
    setLoadingList(true);
    const res = await fetch("/api/messages/conversations");
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setConversations(data.conversations ?? []);
      setContacts(data.contacts ?? []);
    }
    setLoadingList(false);
  }

  async function loadThread(id: string) {
    setLoadingThread(true);
    const res = await fetch(`/api/messages/${id}`);
    const data = await res.json().catch(() => ({}));
    setMessages(res.ok ? data.messages ?? [] : []);
    setLoadingThread(false);
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)));
  }

  async function send() {
    if (!selectedId || !draft.trim()) return;
    setError("");
    const res = await fetch(`/api/messages/${selectedId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Couldn't send that message.");
      return;
    }
    setMessages((prev) => [...prev, data.message]);
    setDraft("");
  }

  async function startConversation(otherUserId: string) {
    setError("");
    const res = await fetch("/api/messages/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otherUserId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Couldn't start that conversation.");
      return;
    }
    setShowNewConvo(false);
    await loadConversations();
    setSelectedId(data.conversationId);
  }

  const accent = ACCENT[variant];
  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="grid gap-4 md:grid-cols-[280px_1fr]">
      <div className={`${selectedId ? "hidden md:block" : "block"} rounded-xl bg-white shadow-sm`}>
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <h2 className="font-semibold text-slate-900">Messages</h2>
          {contacts.length > 0 && (
            <button
              type="button"
              onClick={() => setShowNewConvo((v) => !v)}
              className="min-h-[44px] text-sm font-semibold text-slate-500 hover:text-slate-800"
            >
              + New
            </button>
          )}
        </div>

        {showNewConvo && (
          <div className="border-b border-slate-100 p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Start a conversation</p>
            <div className="space-y-1">
              {contacts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => startConversation(c.id)}
                  className="block min-h-[44px] w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50"
                >
                  {c.display_name} <span className="text-slate-400">({c.role})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <ul className="max-h-[60vh] overflow-y-auto">
          {loadingList && <li className="p-4 text-sm text-slate-400">Loading…</li>}
          {!loadingList && conversations.length === 0 && (
            <li className="p-4 text-sm text-slate-400">No conversations yet.</li>
          )}
          {conversations.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`flex min-h-[44px] w-full items-center justify-between gap-2 border-b border-slate-50 px-4 py-3 text-left text-sm hover:bg-slate-50 ${
                  selectedId === c.id ? "bg-slate-50" : ""
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-slate-900">
                    {c.otherUser?.display_name ?? "Unknown"}
                  </span>
                  <span className="block truncate text-slate-500">{c.lastMessage?.body ?? "No messages yet"}</span>
                </span>
                {c.unreadCount > 0 && (
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${accent}`}>{c.unreadCount}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className={`${selectedId ? "flex" : "hidden md:flex"} min-h-[50vh] flex-col rounded-xl bg-white shadow-sm`}>
        {!selected ? (
          <p className="m-auto text-sm text-slate-400">Pick a conversation to see messages.</p>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-slate-100 p-4">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="min-h-[44px] min-w-[44px] text-slate-400 hover:text-slate-700 md:hidden"
              >
                ←
              </button>
              <h2 className="font-semibold text-slate-900">{selected.otherUser?.display_name ?? "Unknown"}</h2>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {loadingThread && <p className="text-sm text-slate-400">Loading…</p>}
              {!loadingThread &&
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                      m.sender_id === userId ? `ml-auto ${accent}` : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {m.body}
                  </div>
                ))}
            </div>
            {error && <p className="px-4 text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 border-t border-slate-100 p-3">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Type a message…"
                className="min-h-[44px] flex-1 rounded-xl border border-slate-200 px-4 outline-none focus:border-violet-400 focus:ring-2"
              />
              <button type="button" onClick={send} className={`min-h-[44px] rounded-xl px-4 text-sm font-semibold ${accent}`}>
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
