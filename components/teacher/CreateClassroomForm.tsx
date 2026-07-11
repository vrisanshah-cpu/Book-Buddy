"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function CreateClassroomForm({ teacherId }: { teacherId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/setup-classroom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teacherId,
        name: name.trim() || "My Classroom",
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not create classroom.");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <div className="mt-4 max-w-sm space-y-3 rounded-xl bg-white p-6 shadow-sm">
      <Input
        label="Classroom name"
        placeholder="e.g. Room 12 Readers"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button variant="primary" fullWidth disabled={loading} onClick={handleCreate}>
        {loading ? "Creating…" : "Create Classroom"}
      </Button>
    </div>
  );
}