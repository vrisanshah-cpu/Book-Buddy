"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function ParentLinkCodeCard() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function getCode() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/kid/link-code", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setCode(data.code);
    } else {
      setError(data.error ?? "Could not generate a code");
    }
  }

  return (
    <div className="mt-6 rounded-2xl border-2 border-dashed border-kids-purple bg-white p-5">
      <h3 className="font-bold text-slate-900">Link a parent</h3>
      <p className="mt-1 text-sm text-slate-600">
        Get a code and share it with your parent so they can follow your reading.
      </p>
      {code ? (
        <p className="mt-3 text-sm text-slate-700">
          Give this code to your parent:{" "}
          <span className="font-mono font-bold tracking-widest text-kids-purple">{code}</span>{" "}
          <span className="text-xs text-slate-400">(works once, doesn&apos;t expire until used)</span>
        </p>
      ) : (
        <Button variant="kids" className="mt-3" onClick={getCode} disabled={loading}>
          {loading ? "Generating…" : "Get my code"}
        </Button>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}