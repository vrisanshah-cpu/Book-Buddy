"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export function TeacherClubModeration({ clubId }: { clubId: string }) {
  const supabase = createClient();
  const [posts, setPosts] = useState<
    { id: string; content: string; created_at: string; author_name: string }[]
  >([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("book_club_posts")
        .select("id, content, created_at, user_id")
        .eq("club_id", clubId)
        .order("created_at", { ascending: false });
      const rows = [];
      for (const p of data ?? []) {
        const { data: u } = await supabase
          .from("users")
          .select("display_name")
          .eq("id", p.user_id)
          .single();
        rows.push({
          id: p.id,
          content: p.content,
          created_at: p.created_at,
          author_name: u?.display_name ?? "User",
        });
      }
      setPosts(rows);
    }
    load();
  }, [clubId, supabase]);

  async function remove(id: string) {
    await supabase.from("book_club_posts").delete().eq("id", id);
    setPosts(posts.filter((p) => p.id !== id));
  }

  return (
    <div className="mt-4 space-y-2">
      {posts.map((p) => (
        <div key={p.id} className="flex justify-between rounded border bg-slate-50 p-3 text-sm">
          <div>
            <p className="font-medium">{p.author_name}</p>
            <p>{p.content}</p>
          </div>
          <Button variant="secondary" className="!text-xs" onClick={() => remove(p.id)}>
            Delete
          </Button>
        </div>
      ))}
    </div>
  );
}
