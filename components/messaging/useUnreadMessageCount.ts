"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Polled every 30s — good enough for a nav badge without needing realtime. */
export function useUnreadMessageCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { count: unread } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .neq("sender_id", user.id)
        .not("read_by", "cs", `{${user.id}}`);

      if (!cancelled) setCount(unread ?? 0);
    }

    void load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return count;
}
