import { NextResponse } from "next/server";
import { getRequiredEnv, hasAnthropicKey } from "@/lib/env";

export async function GET() {
  const env = getRequiredEnv();
  return NextResponse.json({
    status: env.ok ? "ok" : "misconfigured",
    supabase: env.ok,
    anthropic: hasAnthropicKey(),
    missingEnv: env.missing,
  });
}
