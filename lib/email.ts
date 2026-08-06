import { Resend } from "resend";

let client: Resend | null = null;

export function hasEmailKey(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function getClient(): Resend {
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS ?? "Book Buddy <notifications@bookbuddy.app>";

export type SendEmailResult = { sent: true } | { sent: false; error: string };

/**
 * Sends a transactional email via Resend. No-ops with { sent: false } when
 * RESEND_API_KEY isn't set, matching hasGeminiKey()/hasAnthropicKey()'s
 * pattern elsewhere in lib/ — callers should treat that as "email delivery
 * unavailable right now" and continue (e.g. still show the in-app nudge),
 * not surface it as a user-facing error.
 */
export async function sendEmail(params: { to: string; subject: string; html: string }): Promise<SendEmailResult> {
  if (!hasEmailKey()) return { sent: false, error: "Email not configured" };

  try {
    const { error } = await getClient().emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    if (error) return { sent: false, error: error.message };
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
