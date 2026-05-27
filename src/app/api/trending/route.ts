import { NextResponse } from "next/server";
import { getGroqClient } from "@/lib/groq-client";
import { withGroqRetry } from "@/lib/groq-retry";
import {
  RATE_LIMITS,
  rateLimitByUser,
  requireUser,
  safeErrorMessage,
} from "@/lib/security/api-guard";
import { sanitizeText } from "@/lib/security/sanitize";
import { spendTokens, TOKEN_COSTS, tokenInfoPayload } from "@/lib/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIES = [
  { key: "viral", label: "Viral right now", icon: "🔥" },
  { key: "seasonal", label: "Seasonal trends", icon: "📅" },
  { key: "business", label: "Business trends", icon: "💼" },
  { key: "entertainment", label: "Entertainment trends", icon: "🎬" },
  { key: "lifestyle", label: "Lifestyle trends", icon: "💪" },
] as const;
type CategoryKey = (typeof CATEGORIES)[number]["key"];

type TrendingResponse = {
  generatedAt: number;
  platform: string;
  categories: { key: CategoryKey; label: string; icon: string; topics: string[] }[];
};

// Server-side memory cache keyed by `${platform}` — Groq trending suggestions
// don't change minute-to-minute, so a 60-minute cache is plenty and keeps the
// token cost low even if a user spams the refresh button.
const cacheTtlMs = 60 * 60 * 1000;
const cache = new Map<string, { at: number; payload: TrendingResponse }>();

function currentSeason(): string {
  const now = new Date();
  const month = now.getUTCMonth();
  if (month <= 1 || month === 11) return "Winter";
  if (month <= 4) return "Spring";
  if (month <= 7) return "Summer";
  return "Fall";
}

function currentMonthName(): string {
  return new Date().toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
}

function normalizePlatform(value: string | null): string {
  if (!value) return "Instagram";
  const v = value.trim().slice(0, 40);
  if (!v) return "Instagram";
  return v;
}

function fallbackTopics(platform: string): TrendingResponse {
  const season = currentSeason();
  return {
    generatedAt: Date.now(),
    platform,
    categories: [
      {
        key: "viral",
        label: "Viral right now",
        icon: "🔥",
        topics: [
          "AI tools that changed my workflow",
          "Day-in-the-life behind the scenes",
          "Unboxing my morning routine",
          "Things I wish I knew sooner",
        ],
      },
      {
        key: "seasonal",
        label: `${season} trends`,
        icon: "📅",
        topics: [
          `${season} bucket list`,
          `${season} aesthetic moodboard`,
          `${season} self-care reset`,
          `${season} weekend plans`,
        ],
      },
      {
        key: "business",
        label: "Business trends",
        icon: "💼",
        topics: [
          "Small business behind the scenes",
          "Lessons from my first six months",
          "Pricing my service for the first time",
          "Why I left corporate",
        ],
      },
      {
        key: "entertainment",
        label: "Entertainment trends",
        icon: "🎬",
        topics: [
          "What I'm watching this week",
          "Underrated movies hot take",
          "Concert recap",
          "Album of the month",
        ],
      },
      {
        key: "lifestyle",
        label: "Lifestyle trends",
        icon: "💪",
        topics: [
          "5 AM morning routine",
          "Sunday reset checklist",
          "Mindful productivity tips",
          "Cozy reading nook setup",
        ],
      },
    ],
  };
}

function parseTrendingJson(raw: string): Record<CategoryKey, string[]> | null {
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    const out: Partial<Record<CategoryKey, string[]>> = {};
    for (const cat of CATEGORIES) {
      const value = j[cat.key];
      if (!Array.isArray(value)) {
        return null;
      }
      out[cat.key] = value
        .map((t) => String(t).trim())
        .filter((t) => t.length > 0 && t.length <= 100)
        .slice(0, 6);
    }
    if (Object.values(out).every((arr) => arr && arr.length > 0)) {
      return out as Record<CategoryKey, string[]>;
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const authResult = await requireUser(req, "trending:get");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(userId, "trending:get", RATE_LIMITS.publicRead);
  if (rateLimited) return rateLimited;

  const url = new URL(req.url);
  const platform = normalizePlatform(sanitizeText(url.searchParams.get("platform"), { maxLength: 40 }));
  const refresh = url.searchParams.get("refresh") === "1";

  const cacheKey = platform.toLowerCase();
  const now = Date.now();
  if (!refresh) {
    const hit = cache.get(cacheKey);
    if (hit && now - hit.at < cacheTtlMs) {
      // No token charge for a pure cache hit so refresh doesn't get gamed.
      return NextResponse.json({
        ...hit.payload,
        cached: true,
      });
    }
  }

  const spend = await spendTokens(userId, TOKEN_COSTS.trending, "trending:get");
  if (!spend.ok) {
    return spend.response;
  }

  const groq = getGroqClient();
  if (!groq) {
    const fb = fallbackTopics(platform);
    cache.set(cacheKey, { at: now, payload: fb });
    return NextResponse.json({
      ...fb,
      cached: false,
      source: "fallback",
      tokens: tokenInfoPayload(spend),
    });
  }

  const month = currentMonthName();
  const season = currentSeason();

  try {
    const completion = await withGroqRetry(() =>
      groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.85,
        max_tokens: 900,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You generate short, scroll-stopping trending topic ideas for social media creators. Output strict JSON only.",
          },
          {
            role: "user",
            content: `It is ${month} (${season}) and the creator is posting to ${platform}. Generate 20 fresh, native-feeling trending topic IDEAS, organized into 5 categories — exactly 4 per category. Each topic should be a SHORT noun phrase or hook (under 90 characters) that a real creator could pick up and post about today. Avoid hashtags, avoid emoji, avoid generic words like "amazing" or "best". Use language and references that feel native to ${platform}.

Categories:
- viral: things genuinely trending right now in this niche
- seasonal: tied to ${season} / ${month} (holidays, weather, cultural moments)
- business: trends entrepreneurs, founders, and small business owners are talking about
- entertainment: movies, TV, music, gaming, celebrity moments people are sharing
- lifestyle: fitness, wellness, routines, home, food, fashion, relationships

Return strict JSON with this exact shape: {"viral":["...","...","...","..."],"seasonal":["..."],"business":["..."],"entertainment":["..."],"lifestyle":["..."]}. Exactly 4 items per array.`,
          },
        ],
      })
    );

    const content = completion.choices[0]?.message?.content ?? "";
    const parsed = parseTrendingJson(content);
    if (!parsed) {
      const fb = fallbackTopics(platform);
      cache.set(cacheKey, { at: now, payload: fb });
      return NextResponse.json({
        ...fb,
        cached: false,
        source: "fallback",
        tokens: tokenInfoPayload(spend),
      });
    }

    const payload: TrendingResponse = {
      generatedAt: now,
      platform,
      categories: CATEGORIES.map((cat) => ({
        key: cat.key,
        label: cat.key === "seasonal" ? `${season} trends` : cat.label,
        icon: cat.icon,
        topics: parsed[cat.key],
      })),
    };
    cache.set(cacheKey, { at: now, payload });

    return NextResponse.json({
      ...payload,
      cached: false,
      tokens: tokenInfoPayload(spend),
    });
  } catch (e) {
    return NextResponse.json(
      { error: safeErrorMessage(e, "Trending failed."), categories: [] },
      { status: 500 }
    );
  }
}
