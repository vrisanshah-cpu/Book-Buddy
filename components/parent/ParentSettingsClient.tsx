"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [linkedChildren, setLinkedChildren] = useState<ParentChildProfileData[]>(
    () => collectParentChildProfiles(children)
  );
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("8");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [message, setMessage] = useState("");

  const [linkCode, setLinkCode] = useState("");
  const [linkMessage, setLinkMessage] = useState("");
  const [codeByChild, setCodeByChild] = useState<Record<string, string>>({});

  async function addChild() {
    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    const res = await fetch("/api/auth/create-child", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parentId,
        username,
        displayName,
        age: parseInt(age, 10),
        avatarUrl: avatar,
        password,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(
        `Added ${displayName}! They can log in with username "${username}" and the password you set.`
      );
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
      setPassword("");
      router.refresh();
    } else {
      setMessage(data.error ?? "Failed");
    }
  }

  async function getLinkCode(childId: string) {
    const res = await fetch("/api/parent/child-link-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId }),
    });
    const data = await res.json();
    if (res.ok) {
      setCodeByChild((prev) => ({ ...prev, [childId]: data.code }));
    } else {
      setMessage(data.error ?? "Could not generate a code");
    }
  }

  async function linkExistingChild() {
    setLinkMessage("");
    const res = await fetch("/api/parent/link-child", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: linkCode }),
    });
    const data = await res.json();
    if (res.ok) {
      setLinkMessage(`Linked ${data.displayName}!`);
      setLinkedChildren((prev) =>
        prev.some((c) => c.id === data.childId)
          ? prev
          : [
              ...prev,
              {
                id: data.childId,
                display_name: data.displayName,
                username: data.username,
                age: data.age,
              },
            ]
      );
      setLinkCode("");
      router.refresh();
    } else {
      setLinkMessage(data.error ?? "That code didn't work");
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
              <div className="flex items-center justify-between gap-3">
                <span>
                  {c.display_name} · @{c.username ?? "—"} · age {c.age ?? "—"}
                </span>
                <Button
                  variant="secondary"
                  className="!text-xs"
                  onClick={() => getLinkCode(c.id)}
                >
                  Get link code
                </Button>
              </div>
              {codeByChild[c.id] && (
                <p className="mt-2 text-sm text-slate-600">
                  Share this code with another parent so they can link to{" "}
                  {c.display_name}&apos;s profile too:{" "}
                  <span className="font-mono font-bold tracking-widest">
                    {codeByChild[c.id]}
                  </span>{" "}
                  <span className="text-xs text-slate-400">
                    (works once, doesn&apos;t expire until used)
                  </span>
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="font-semibold">Link an existing child profile</h2>
        <p className="mt-1 text-sm text-slate-500">
          If another parent already set up this child&apos;s profile, ask them for a
          link code from their Settings page instead of creating a new profile.
        </p>
        <div className="mt-4 flex gap-2">
          <Input
            label="Link code"
            value={linkCode}
            onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
          />
          <Button variant="primary" onClick={linkExistingChild}>
            Link
          </Button>
        </div>
        {linkMessage && <p className="mt-2 text-sm text-blue-600">{linkMessage}</p>}
      </section>

      <section className="mt-8 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="font-semibold">Add another child</h2>
        <div className="mt-4 space-y-3">
          <Input label="Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <Input label="Age" type="number" value={age} onChange={(e) => setAge(e.target.value)} />
          <Input
            label="Password (tell this to your child)"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
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