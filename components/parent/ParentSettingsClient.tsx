"use client";

import { useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  collectParentChildProfiles,
  type ParentChildProfileData,
} from "@/components/parent/ParentChildProfile";

const AVATARS = ["🦊", "🐼", "🦁", "🐸", "🦄", "🐨"];

export function ParentSettingsClient({
  parentId,
  children,
}: {
  parentId: string;
  children?: ReactNode;
}) {
  const supabase = createClient();
  const [linkedChildren, setLinkedChildren] = useState<ParentChildProfileData[]>(
    () => collectParentChildProfiles(children)
  );
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("8");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [message, setMessage] = useState("");

  async function addChild() {
    const res = await fetch("/api/auth/create-child", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parentId,
        username,
        displayName,
        age: parseInt(age, 10),
        avatarUrl: avatar,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(`Added ${displayName}!`);
      setLinkedChildren([
        ...linkedChildren,
        {
          id: data.childId,
          display_name: displayName,
          username,
          age: parseInt(age, 10),
        },
      ]);
      setUsername("");
      setDisplayName("");
    } else {
      setMessage(data.error ?? "Failed");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Settings</h1>

      <section className="mt-8">
        <h2 className="font-semibold">Child profiles</h2>
        <ul className="mt-3 space-y-2">
          {linkedChildren.map((c) => (
            <li key={c.id} className="rounded-lg bg-white p-4 shadow-sm">
              {c.display_name} · @{c.username ?? "—"} · age {c.age ?? "—"}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="font-semibold">Add another child</h2>
        <div className="mt-4 space-y-3">
          <Input label="Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <Input label="Age" type="number" value={age} onChange={(e) => setAge(e.target.value)} />
          <div className="flex gap-2">
            {AVATARS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAvatar(a)}
                className={`text-2xl ${avatar === a ? "ring-2 ring-blue-500 rounded" : ""}`}
              >
                {a}
              </button>
            ))}
          </div>
          <Button variant="primary" onClick={addChild}>
            Add child
          </Button>
          {message && <p className="text-sm text-blue-600">{message}</p>}
        </div>
      </section>

      <Button variant="ghost" className="mt-8" onClick={signOut}>
        Sign out
      </Button>
    </div>
  );
}
