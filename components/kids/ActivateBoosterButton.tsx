"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function ActivateBoosterButton({ ownedCount }: { ownedCount: number }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [activated, setActivated] = useState(false);

  async function activate() {
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/kids/activate-booster", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "Couldn't activate that.");
      return;
    }
    setActivated(true);
  }

  if (ownedCount === 0) {
    return <p className="text-sm text-slate-400">You don&apos;t own a booster yet — check the Shop!</p>;
  }

  if (activated) {
    return <p className="text-sm font-semibold text-emerald-600">⚡ Booster active for the next 24 hours!</p>;
  }

  return (
    <div>
      <Button variant="kids" disabled={busy} onClick={activate}>
        {busy ? "Activating…" : `⚡ Activate 2x Booster (×${ownedCount} owned)`}
      </Button>
      {message && <p className="mt-1 text-sm text-red-600">{message}</p>}
    </div>
  );
}
