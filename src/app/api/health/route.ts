import { NextResponse } from "next/server";
import { RATE_LIMITS, rateLimitByIp } from "@/lib/security/api-guard";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const rateLimited = rateLimitByIp(req, "health", RATE_LIMITS.publicRead);
  if (rateLimited) return rateLimited;

  return NextResponse.json({
    ok: true,
    service: "captionai",
    time: new Date().toISOString(),
  });
}
