"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ROLE_HOME } from "@/lib/constants";
import type { UserRole } from "@/lib/types";

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", data.user.id)
      .single();

    const role = (profile?.role ?? "kid") as UserRole;
    router.push(ROLE_HOME[role]);
    router.refresh();
  }

  return (
    <AuthLayout title="Welcome back!" subtitle="Log in to continue reading.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <Button type="submit" variant="kids" fullWidth disabled={loading}>
          {loading ? "Logging in…" : "Log in"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        <Link href="/auth/forgot-password" className="text-kids-purple hover:underline">
          Forgot password?
        </Link>
      </p>
      <p className="mt-6 text-center text-sm text-slate-600">
        New here?{" "}
        <Link href="/auth/register" className="font-semibold text-kids-purple hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
