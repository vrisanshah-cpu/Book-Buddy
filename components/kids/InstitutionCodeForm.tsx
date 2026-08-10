"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface LinkedInstitution {
  name: string;
  type: "school" | "company";
  logo_url: string | null;
  welcome_message: string | null;
}

export function InstitutionCodeForm({
  initialInstitution,
}: {
  initialInstitution: LinkedInstitution | null;
}) {
  const [code, setCode] = useState("");
  const [linked, setLinked] = useState<LinkedInstitution | null>(initialInstitution);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  async function join() {
    setError("");
    if (!code.trim()) {
      setError("Enter a code first.");
      return;
    }
    setJoining(true);
    try {
      const res = await fetch("/api/kids/join-institution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong — try again.");
        return;
      }
      setLinked(data.institution);
      setCode("");
    } catch {
      setError("Something went wrong — try again.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl bg-white p-5 shadow-md">
      <div>
        <h2 className="font-kids-display text-xl font-bold text-slate-900">
          School or company code
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Got a code from your school or company? Enter it here to see your custom welcome
          on your homescreen.
        </p>
      </div>

      {linked && (
        <div className="rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-800 ring-1 ring-violet-200" role="status" aria-live="polite">
          <p className="font-semibold">You&apos;re linked to {linked.name}.</p>
          {linked.welcome_message && <p className="mt-1">{linked.welcome_message}</p>}
          <p className="mt-1 text-violet-600">Enter a new code below to switch.</p>
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Enter your code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-label="School or company code"
        />
        <Button variant="kids" onClick={join} disabled={joining}>
          {joining ? "Joining…" : linked ? "Switch" : "Join"}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-600" role="status" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}
