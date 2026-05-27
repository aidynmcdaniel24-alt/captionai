import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { logAdminEvent } from "@/lib/admin-log";
import type { CaptionScore } from "@/lib/caption-score";
import { sendHighScoreCaptionEmail } from "@/lib/emails";
import { supabaseServer } from "@/lib/supabase/server";

const HIGH_SCORE_THRESHOLD = 80;

/**
 * Pick the highest-scoring caption from a generation result. Returns `null`
 * when the top score is below the celebration threshold so we don't spam the
 * user with mediocre wins.
 */
function pickWinner(
  captions: string[],
  scores: CaptionScore[]
): { caption: string; score: CaptionScore } | null {
  let best: { caption: string; score: CaptionScore } | null = null;
  for (let i = 0; i < captions.length; i++) {
    const score = scores[i];
    const caption = captions[i];
    if (!score || !caption) continue;
    if (score.total < HIGH_SCORE_THRESHOLD) continue;
    if (!best || score.total > best.score.total) {
      best = { caption, score };
    }
  }
  return best;
}

/**
 * Has this user already received a high-score email today? Uses the
 * `notification_emails` table keyed on `(user_id, kind, date)` so we never
 * send more than one congratulations per UTC day.
 */
async function hasSentTodayUtc(userId: string): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  const start = `${today}T00:00:00.000Z`;
  const end = `${today}T23:59:59.999Z`;

  const { data, error } = await supabaseServer
    .from("notification_emails")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", "high_score")
    .gte("sent_at", start)
    .lte("sent_at", end)
    .limit(1);

  if (error) {
    console.warn("[score-notifications] read failed:", error.message);
    return true;
  }
  return Array.isArray(data) && data.length > 0;
}

/**
 * Side-effect: if any caption scored >= 80, send a celebratory email to the
 * user (max once per day) and record the send in `notification_emails`.
 *
 * Designed to fail closed and never throw — call sites can await this without
 * any try/catch.
 */
export async function maybeSendHighScoreEmail(params: {
  userId: string;
  captions: string[];
  scores: CaptionScore[];
  platform: string;
}): Promise<void> {
  const { userId, captions, scores, platform } = params;
  if (!Array.isArray(captions) || !Array.isArray(scores)) return;

  const winner = pickWinner(captions, scores);
  if (!winner) return;

  try {
    if (await hasSentTodayUtc(userId)) {
      return;
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const primaryId = user.primaryEmailAddressId;
    const email =
      user.emailAddresses.find((e) => e.id === primaryId)?.emailAddress ??
      user.emailAddresses[0]?.emailAddress;

    if (!email) return;

    const firstName = user.firstName?.trim() || undefined;
    const send = await sendHighScoreCaptionEmail(email, {
      firstName,
      score: winner.score.total,
      caption: winner.caption,
      platform,
      breakdown: winner.score.breakdown,
      explanation: winner.score.explanation,
    });

    if (!send.ok) {
      return;
    }

    const { error: insertErr } = await supabaseServer
      .from("notification_emails")
      .insert({
        user_id: userId,
        caption_text: winner.caption.slice(0, 2000),
        score: winner.score.total,
        kind: "high_score",
        sent_at: new Date().toISOString(),
      });
    if (insertErr) {
      console.warn(
        "[score-notifications] insert failed (run notification_emails.sql?):",
        insertErr.message
      );
    }

    await logAdminEvent("info", "high_score_email_sent", {
      user_id: userId,
      score: winner.score.total,
      platform,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.warn("[score-notifications] unexpected:", msg);
  }
}
