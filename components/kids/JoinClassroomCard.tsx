"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function JoinClassroomCard() {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function join() {
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/classroom/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ joinCode: code }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setMessage(`Joined ${data.classroom.name}! 🎉`);
    } else {
      setMessage(data.error ?? "Could not join");
    }
  }

  return (
    <div className="mt-6 rounded-2xl border-2 border-dashed border-kids-teal bg-white p-5">
      <h3 className="font-bold text-slate-900">Join your classroom</h3>
      <p className="mt-1 text-sm text-slate-600">
        Enter the code from your teacher.
      </p>
      <div className="mt-3 flex gap-2">
        <Input
          placeholder="ABC123"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <Button variant="kids" onClick={join} disabled={loading}>
          Join
        </Button>
      </div>
      {message && <p className="mt-2 text-sm text-kids-purple">{message}</p>}
    </div>
  );
}
