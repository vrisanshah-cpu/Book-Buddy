import { NextRequest, NextResponse } from "next/server";

// Ko-fi POSTs application/x-www-form-urlencoded with a single "data" field
// containing a JSON string. Docs: https://ko-fi.com/manage/webhooks
interface KofiPayload {
  verification_token: string;
  message_id: string;
  timestamp: string;
  type: "Donation" | "Subscription" | "Commission" | "Shop Order";
  from_name: string;
  message: string | null;
  amount: string;
  currency: string;
  is_public: boolean;
  email: string;
  kofi_transaction_id: string;
}

export async function POST(req: NextRequest) {
  let payload: KofiPayload;

  try {
    const formData = await req.formData();
    const raw = formData.get("data");
    if (typeof raw !== "string") {
      return NextResponse.json({ error: "Missing data field" }, { status: 400 });
    }
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  // Verify the shared secret before trusting anything else in the payload.
  const expected = process.env.KOFI_VERIFICATION_TOKEN;
  if (!expected || payload.verification_token !== expected) {
    return NextResponse.json({ error: "Invalid verification token" }, { status: 401 });
  }

  const { from_name, amount, currency, message, kofi_transaction_id, type } = payload;

  // TODO: no `donations` table exists in supabase/migrations yet. If you want
  // this persisted (e.g. a supporter wall or admin view), tell me and I'll
  // write the migration + insert here via lib/supabase/admin.ts. For now this
  // just logs — visible in Vercel's function logs.
  console.log(`[kofi] ${type} from ${from_name}: ${amount} ${currency} (${kofi_transaction_id})`, {
    message,
  });

  // Ko-fi only requires a 200 to mark the webhook delivered.
  return NextResponse.json({ received: true }, { status: 200 });
}
