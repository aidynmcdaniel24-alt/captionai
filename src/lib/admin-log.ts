import "server-only";

import { supabaseServer } from "@/lib/supabase/server";

export async function logAdminEvent(
  level: "info" | "warn" | "error",
  message: string,
  meta?: Record<string, unknown>
) {
  try {
    await supabaseServer.from("admin_logs").insert({
      level,
      message,
      meta: meta ?? null,
    });
  } catch {
    /* avoid throwing from logging */
  }
}
