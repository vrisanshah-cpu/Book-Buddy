"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Club {
  id: string;
  name: string;
  description: string | null;
  current_book_id: string | null;
  book?: { title: string; author: string; cover_url: string | null } | null;
  member_count?: number;
}

interface ClubPost {
  id: string;
  content: string;
  created_at: string;
  author: { display_name: string; avatar_url: string | null };
}

export function BookClubClient({ userId }: { userId: string }) {
  const supabase = createClient();
  const [myClubs, setMyClubs] = useState<Club[]>([]);
  const [available, setAvailable] = useState<Club[]>([]);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [posts, setPosts] = useState<ClubPost[]>([]);
  const [newPost, setNewPost] = useState("");
  const [members, setMembers] = useState<{ display_name: string; avatar_url: string | null }[]>([]);

  const loadClubs = useCallback(async () => {
    const { data: memberships } = await supabase
      .from("book_club_members")
      .select("club_id")
      .eq("user_id", userId);

    const clubIds = memberships?.map((m) => m.club_id) ?? [];

    if (clubIds.length) {
      const { data: clubs } = await supabase
        .from("book_clubs")
        .select("id, name, description, current_book_id, book:books(title, author, cover_url)")
        .in("id", clubIds);
        const normalizedClubs = (clubs ?? []).map((c) => ({
          ...c,
          book: Array.isArray(c.book) ? c.book[0] ?? null : c.book,
        }));
        setMyClubs(normalizedClubs as Club[]);
    } else {
      setMyClubs([]);
    }

    const { data: all } = await supabase
      .from("book_clubs")
      .select("id, name, description, current_book_id")
      .limit(20);

    setAvailable(
      (all ?? []).filter((c) => !clubIds.includes(c.id)) as Club[]
    );
  }, [supabase, userId]);

  const loadClubDetail = useCallback(
    async (club: Club) => {
      setSelectedClub(club);
      const { data: book } = club.current_book_id
        ? await supabase
            .from("books")
            .select("title, author, cover_url")
            .eq("id", club.current_book_id)
            .single()
        : { data: null };

      setSelectedClub({ ...club, book: book ?? undefined });

      const { data: postRows } = await supabase
        .from("book_club_posts")
        .select("id, content, created_at, user_id")
        .eq("club_id", club.id)
        .order("created_at", { ascending: false });

      const postsWithAuthors: ClubPost[] = [];
      for (const p of postRows ?? []) {
        const { data: u } = await supabase
          .from("users")
          .select("display_name, avatar_url")
          .eq("id", p.user_id)
          .single();
        postsWithAuthors.push({
          id: p.id,
          content: p.content,
          created_at: p.created_at,
          author: u ?? { display_name: "Reader", avatar_url: null },
        });
      }
      setPosts(postsWithAuthors);

      const { data: memberRows } = await supabase
        .from("book_club_members")
        .select("user_id")
        .eq("club_id", club.id);

      const memberList: { display_name: string; avatar_url: string | null }[] = [];
      for (const m of memberRows ?? []) {
        const { data: u } = await supabase
          .from("users")
          .select("display_name, avatar_url")
          .eq("id", m.user_id)
          .single();
        if (u) memberList.push(u);
      }
      setMembers(memberList);
    },
    [supabase]
  );

  useEffect(() => {
    loadClubs();
  }, [loadClubs]);

  async function joinClub(clubId: string) {
    await supabase.from("book_club_members").insert({
      club_id: clubId,
      user_id: userId,
    });
    loadClubs();
  }

  async function postComment() {
    if (!selectedClub || !newPost.trim()) return;
    await supabase.from("book_club_posts").insert({
      club_id: selectedClub.id,
      user_id: userId,
      content: newPost.trim(),
    });
    setNewPost("");
    loadClubDetail(selectedClub);
  }

  if (selectedClub) {
    return (
      <div>
        <Button variant="ghost" onClick={() => setSelectedClub(null)}>
          ← Back to clubs
        </Button>
        <h1 className="mt-4 font-kids-display text-2xl font-bold">
          {selectedClub.name}
        </h1>
        <p className="text-slate-600">{selectedClub.description}</p>

        {selectedClub.book && (
          <div className="mt-6 flex gap-4 rounded-2xl bg-white p-4 shadow-md">
            {selectedClub.book.cover_url && (
              <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg">
                <Image
                  src={selectedClub.book.cover_url}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}
            <div>
              <p className="text-sm text-slate-500">Now reading</p>
              <p className="font-bold">{selectedClub.book.title}</p>
              <p className="text-sm">{selectedClub.book.author}</p>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {members.map((m, i) => (
            <span
              key={i}
              className="rounded-full bg-violet-100 px-3 py-1 text-sm"
              title={m.display_name}
            >
              {m.avatar_url ?? "👤"} {m.display_name}
            </span>
          ))}
        </div>

        <div className="mt-8 space-y-3">
          <h2 className="font-bold">Discussion</h2>
          {posts.map((p) => (
            <div key={p.id} className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">{p.author?.display_name}</p>
              <p className="mt-1">{p.content}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <Input
            placeholder="Write a comment…"
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
          />
          <Button variant="kids" onClick={postComment}>
            Post
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-kids-display text-3xl font-bold">Book Club</h1>

      <h2 className="mt-8 font-bold text-slate-800">My clubs</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {myClubs.map((club) => (
          <button
            key={club.id}
            type="button"
            onClick={() => loadClubDetail(club)}
            className="rounded-2xl bg-white p-5 text-left shadow-md hover:shadow-lg"
          >
            <h3 className="font-bold">{club.name}</h3>
            <p className="mt-1 text-sm text-slate-500 line-clamp-2">
              {club.description}
            </p>
            {club.book && (
              <p className="mt-2 text-xs text-kids-purple">
                📖 {club.book.title}
              </p>
            )}
          </button>
        ))}
        {myClubs.length === 0 && (
          <p className="text-slate-500">Join a club to get started!</p>
        )}
      </div>

      <h2 className="mt-10 font-bold text-slate-800">Join a club</h2>
      <div className="mt-3 space-y-2">
        {available.map((club) => (
          <div
            key={club.id}
            className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm"
          >
            <div>
              <p className="font-semibold">{club.name}</p>
              <p className="text-sm text-slate-500">{club.description}</p>
            </div>
            <Button variant="kids" onClick={() => joinClub(club.id)}>
              Join
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
