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

const ROLES: { id: UserRole; label: string; emoji: string; desc: string }[] = [
  { id: "kid", label: "Kid", emoji: "🌟", desc: "I love reading adventures!" },
  { id: "parent", label: "Parent", emoji: "👨‍👩‍👧", desc: "I track my child's reading" },
  { id: "teacher", label: "Teacher", emoji: "📋", desc: "I manage a classroom" },
];

const AVATARS = ["🦊", "🐼", "🦁", "🐸", "🦄", "🐨", "🐯", "🐰"];

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [role, setRole] = useState<UserRole | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [gradeLevels, setGradeLevels] = useState("");
  const [childUsername, setChildUsername] = useState("");
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [childAvatar, setChildAvatar] = useState(AVATARS[0]);
  const [addChild, setAddChild] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!role) return;
    setError("");
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          display_name: displayName,
          school_name: role === "teacher" ? schoolName : undefined,
          grade_levels: role === "teacher" ? gradeLevels : undefined,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError("Check your email to confirm your account.");
      setLoading(false);
      return;
    }

    await supabase.from("users").upsert({
      id: data.user.id,
      email,
      role,
      display_name: displayName,
      school_name: role === "teacher" ? schoolName : null,
      grade_levels: role === "teacher" ? gradeLevels : null,
    });

    if (role === "parent" && addChild && childUsername && childName) {
      const res = await fetch("/api/auth/create-child", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentId: data.user.id,
          username: childUsername,
          displayName: childName,
          age: parseInt(childAge, 10) || 8,
          avatarUrl: childAvatar,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Could not create child profile.");
        setLoading(false);
        return;
      }
    }

    if (role === "teacher") {
      await fetch("/api/auth/setup-classroom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: data.user.id,
          name: gradeLevels ? `${gradeLevels} Class` : "My Classroom",
        }),
      });
    }

    router.push(ROLE_HOME[role]);
    router.refresh();
  }

  return (
    <AuthLayout
      title={step === 1 ? "Who are you?" : step === 2 ? "Your account" : "Almost done!"}
      subtitle={
        step === 1
          ? "Pick your role to get started."
          : step === 2
            ? "Tell us a bit about yourself."
            : role === "parent"
              ? "Add a child profile (optional)."
              : role === "teacher"
                ? "Tell us about your school."
                : "You're ready to read!"
      }
    >
      {step === 1 && (
        <div className="space-y-3">
          {ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRole(r.id)}
              className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition ${
                role === r.id
                  ? "border-kids-purple bg-violet-50"
                  : "border-slate-200 hover:border-violet-200"
              }`}
            >
              <span className="text-3xl">{r.emoji}</span>
              <div>
                <div className="font-bold text-slate-900">{r.label}</div>
                <div className="text-sm text-slate-600">{r.desc}</div>
              </div>
            </button>
          ))}
          <Button
            variant="kids"
            fullWidth
            disabled={!role}
            onClick={() => setStep(2)}
          >
            Continue
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Input
            id="displayName"
            label="Your name"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <Input
            id="email"
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            id="password"
            label="Password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              variant="kids"
              fullWidth
              disabled={!displayName || !email || password.length < 6}
              onClick={() => {
                if (role === "parent" || role === "teacher") setStep(3);
                else handleRegister();
              }}
            >
              {role === "parent" || role === "teacher" ? "Continue" : "Create account"}
            </Button>
          </div>
        </div>
      )}

      {step === 3 && role === "teacher" && (
        <div className="space-y-4">
          <Input
            id="schoolName"
            label="School name"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
          />
          <Input
            id="gradeLevels"
            label="Grade level(s)"
            placeholder="e.g. Grade 3, Grade 4"
            value={gradeLevels}
            onChange={(e) => setGradeLevels(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button variant="kids" fullWidth disabled={loading} onClick={handleRegister}>
              {loading ? "Creating…" : "Create account"}
            </Button>
          </div>
        </div>
      )}

      {step === 3 && role === "parent" && (
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={addChild}
              onChange={(e) => setAddChild(e.target.checked)}
            />
            Add a child profile now
          </label>
          {addChild && (
            <>
              <Input
                id="childName"
                label="Child's name"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
              />
              <Input
                id="childUsername"
                label="Username (for login)"
                value={childUsername}
                onChange={(e) => setChildUsername(e.target.value)}
              />
              <Input
                id="childAge"
                label="Age"
                type="number"
                min={5}
                max={12}
                value={childAge}
                onChange={(e) => setChildAge(e.target.value)}
              />
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Avatar</p>
                <div className="flex flex-wrap gap-2">
                  {AVATARS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setChildAvatar(a)}
                      className={`rounded-xl border-2 p-2 text-2xl ${
                        childAvatar === a ? "border-kids-purple" : "border-transparent"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button variant="kids" fullWidth disabled={loading} onClick={handleRegister}>
              {loading ? "Creating…" : "Create account"}
            </Button>
          </div>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/auth/login" className="font-semibold text-kids-purple hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
