"use client";

import { BrandLogo } from "@/components/BrandLogo";
import { CaptionHistorySection } from "@/components/CaptionHistorySection";
import { BestTimeCard } from "@/components/dashboard/BestTimeCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const PLATFORM_OPTIONS = ["Instagram", "TikTok", "LinkedIn", "Twitter/X", "Custom"] as const;
const tones = ["funny", "professional", "hype", "inspirational"] as const;

const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Italian",
  "Japanese",
  "Korean",
];

type Tab = "captions" | "hashtags" | "bio" | "trending" | "ab";

type ApiResult = {
  captions?: string[];
  emojiPerCaption?: string[][];
  historyId?: string;
  plan?: "free" | "pro";
  usage?: {
    count: number;
    limit: number | null;
    date: string;
  };
  error?: string;
  details?: string;
  stage?: string;
  paywall?: boolean;
  limit?: number;
  count?: number;
};

export function DashboardPageClient() {
  const [tab, setTab] = useState<Tab>("captions");
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState<(typeof PLATFORM_OPTIONS)[number]>("Instagram");
  const [platformCustom, setPlatformCustom] = useState("");
  const [tone, setTone] = useState<(typeof tones)[number]>("inspirational");
  const [language, setLanguage] = useState("English");
  const [captions, setCaptions] = useState<string[]>([]);
  const [emojiPerCaption, setEmojiPerCaption] = useState<string[][]>([]);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [usageText, setUsageText] = useState("");
  const [usageToday, setUsageToday] = useState<number | null>(null);
  const [freeLimit, setFreeLimit] = useState(5);
  const [plan, setPlan] = useState<"free" | "pro" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPaywall, setShowPaywall] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const [ratings, setRatings] = useState<Record<number, "worst" | "medium" | "best">>({});
  const [fav, setFav] = useState<Record<number, boolean>>({});

  // Hashtags tab
  const [htags, setHtags] = useState<string[]>([]);
  const [htLoading, setHtLoading] = useState(false);
  // Bio tab
  const [bio, setBio] = useState("");
  const [bioLoading, setBioLoading] = useState(false);
  // Trending
  const [trending, setTrending] = useState<string[]>([]);
  const [trLoading, setTrLoading] = useState(false);
  const [trendingLoaded, setTrendingLoaded] = useState(false);
  // A/B
  const [abA, setAbA] = useState("");
  const [abB, setAbB] = useState("");
  const [abExpId, setAbExpId] = useState<string | null>(null);
  const [abLoading, setAbLoading] = useState(false);

  const shell =
    "min-h-screen bg-zinc-50 text-zinc-900 dark:bg-gradient-to-b dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 dark:text-white";

  const refreshPlan = useCallback(async () => {
    try {
      const res = await fetch("/api/profile/stats");
      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as {
        plan?: string;
        usageToday?: number;
        freeLimit?: number;
      };
      setPlan(data.plan === "pro" ? "pro" : "free");
      if (typeof data.usageToday === "number") {
        setUsageToday(data.usageToday);
      }
      if (typeof data.freeLimit === "number") {
        setFreeLimit(data.freeLimit);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refreshPlan();
  }, [refreshPlan]);

  async function startCheckout(interval?: "month" | "year") {
    setCheckoutLoading(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(interval === "year" ? { interval: "year" } : {}),
      });
      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok) {
        setError(data.error || "Could not start checkout.");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError("Checkout did not return a URL.");
    } catch {
      setError("Could not connect to checkout. Try again.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function handleGenerate() {
    setError("");
    setIsLoading(true);
    setRatings({});
    setFav({});

    try {
      const res = await fetch("/api/captions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          platform,
          platformCustom,
          tone,
          language,
        }),
      });

      const data = (await res.json()) as ApiResult;

      if (!res.ok) {
        if (data.paywall) {
          setShowPaywall(true);
          setUsageText(`Free limit reached: ${data.count}/${data.limit} used today.`);
          setCaptions([]);
          setEmojiPerCaption([]);
          setHistoryId(null);
          return;
        }

        const fullError = [data.error, data.stage ? `(stage: ${data.stage})` : null, data.details]
          .filter(Boolean)
          .join(" ");
        setError(fullError || "Something went wrong.");
        return;
      }

      setShowPaywall(false);
      setCaptions(data.captions ?? []);
      setEmojiPerCaption(data.emojiPerCaption ?? []);
      setHistoryId(data.historyId ?? null);
      setHistoryKey((k) => k + 1);

      if (data.usage?.limit) {
        setUsageText(`Free plan usage: ${data.usage.count}/${data.usage.limit} today`);
      } else {
        setUsageText(`Pro plan: unlimited usage`);
      }
      await refreshPlan();
    } catch {
      setError("Could not generate captions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy(caption: string, index: number) {
    await navigator.clipboard.writeText(caption);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1200);
  }

  async function copyAll() {
    if (captions.length === 0) {
      return;
    }
    await navigator.clipboard.writeText(captions.join("\n\n"));
  }

  function downloadTxt() {
    if (captions.length === 0) {
      return;
    }
    const blob = new Blob([captions.join("\n\n")], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "captionai-captions.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function setRating(index: number, rating: "worst" | "medium" | "best") {
    setRatings((r) => ({ ...r, [index]: rating }));
    if (!historyId) {
      return;
    }
    await fetch("/api/captions/rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ historyId, captionIndex: index, rating }),
    });
  }

  async function toggleFavorite(index: number) {
    const on = !fav[index];
    setFav((f) => ({ ...f, [index]: on }));
    if (!historyId) {
      return;
    }
    await fetch("/api/captions/favorite", {
      method: on ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ historyId, captionIndex: index }),
    });
  }

  async function runHashtags() {
    setHtLoading(true);
    setHtags([]);
    setError("");
    try {
      const res = await fetch("/api/tools/hashtags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          platform: platform === "Custom" ? platformCustom || "Social" : platform,
          count: 15,
        }),
      });
      const data = (await res.json()) as { hashtags?: string[]; error?: string };
      if (!res.ok) {
        setError(data.error || "Hashtag generation failed.");
        return;
      }
      setHtags(data.hashtags ?? []);
    } catch {
      setError("Network error.");
    } finally {
      setHtLoading(false);
    }
  }

  async function runBio() {
    setBioLoading(true);
    setBio("");
    setError("");
    try {
      const res = await fetch("/api/tools/bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          about: topic,
          platform: platform === "Custom" ? platformCustom || "Instagram" : platform,
          tone,
        }),
      });
      const data = (await res.json()) as { bio?: string; error?: string };
      if (!res.ok) {
        setError(data.error || "Bio generation failed.");
        return;
      }
      if (data.bio) {
        setBio(data.bio);
      }
    } catch {
      setError("Network error.");
    } finally {
      setBioLoading(false);
    }
  }

  async function loadTrending() {
    setTrLoading(true);
    try {
      const res = await fetch("/api/trending");
      const data = (await res.json()) as { topics?: string[] };
      setTrending(data.topics ?? []);
    } catch {
      setTrending([]);
    } finally {
      setTrLoading(false);
      setTrendingLoaded(true);
    }
  }

  useEffect(() => {
    if (tab === "trending" && !trendingLoaded && !trLoading) {
      void loadTrending();
    }
  }, [tab, trendingLoaded, trLoading]);

  async function generateAbPair() {
    setAbLoading(true);
    setAbA("");
    setAbB("");
    setAbExpId(null);
    setError("");
    try {
      const res = await fetch("/api/tools/ab-pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          platform: platform === "Custom" ? platformCustom || "Instagram" : platform,
          tone,
        }),
      });
      const data = (await res.json()) as { a?: string; b?: string; error?: string };
      if (!res.ok) {
        setError(data.error || "Could not generate pair.");
        return;
      }
      setAbA(data.a ?? "");
      setAbB(data.b ?? "");
    } catch {
      setError("Network error.");
    } finally {
      setAbLoading(false);
    }
  }

  async function saveAbExperiment() {
    if (!abA.trim() || !abB.trim()) {
      return;
    }
    const res = await fetch("/api/ab-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        variantA: abA,
        variantB: abB,
        label: topic.slice(0, 80),
        platform: platform === "Custom" ? platformCustom : platform,
      }),
    });
    const data = (await res.json()) as { id?: string; error?: string };
    if (res.ok && data.id) {
      setAbExpId(data.id);
    }
  }

  async function pickAb(side: "a" | "b") {
    if (!abExpId) {
      return;
    }
    await fetch("/api/ab-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pick", id: abExpId, pick: side }),
    });
  }

  const showFreeWarning = plan === "free" && usageToday !== null && usageToday >= 3 && usageToday < freeLimit;

  return (
    <main className={`${shell} px-6 py-8`}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="shrink-0 rounded-lg outline-none ring-offset-2 ring-offset-white focus-visible:ring-2 focus-visible:ring-purple-500 dark:ring-offset-zinc-900"
              aria-label="CaptionAI home"
            >
              <BrandLogo className="h-9 w-9" />
            </Link>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-widest text-purple-600 dark:text-purple-300">CaptionAI</p>
              <h1 className="text-3xl font-semibold">AI Caption Studio</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ThemeToggle />
            {plan === "free" ? (
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full bg-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-purple-500 disabled:opacity-50"
                disabled={checkoutLoading}
                onClick={() => startCheckout("month")}
              >
                {checkoutLoading ? "Opening checkout…" : "Upgrade — $9/mo"}
              </button>
            ) : plan === "pro" ? (
              <span className="rounded-lg border border-emerald-700/80 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800 dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-emerald-300">
                Pro
              </span>
            ) : null}
            <Link
              href="/profile"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Profile
            </Link>
            <Link
              href="/affiliate"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Affiliate
            </Link>
            <UserButton userProfileUrl="/settings" userProfileMode="navigation" />
          </div>
        </div>

        {showFreeWarning ? (
          <div
            className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100"
            role="status"
          >
            You have used {usageToday} of {freeLimit} free generations today. Upgrade for unlimited captions, or
            come back tomorrow.
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 rounded-2xl border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900/60">
          {(
            [
              ["captions", "Captions"],
              ["hashtags", "Hashtags"],
              ["bio", "Bio"],
              ["trending", "Trending"],
              ["ab", "A/B test"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                tab === id
                  ? "bg-purple-600 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "captions" ? (
          <>
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
              <label className="mb-2 block text-sm text-zinc-600 dark:text-zinc-300">Photo/topic description</label>
              <textarea
                className="min-h-32 w-full rounded-xl border border-zinc-300 bg-white p-3 text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                placeholder="Example: my coffee shop in New Orleans"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-zinc-600 dark:text-zinc-300">Platform</label>
                  <select
                    className="w-full rounded-xl border border-zinc-300 bg-white p-2.5 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as (typeof PLATFORM_OPTIONS)[number])}
                  >
                    {PLATFORM_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  {platform === "Custom" ? (
                    <input
                      className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                      placeholder="Your platform name"
                      value={platformCustom}
                      onChange={(e) => setPlatformCustom(e.target.value)}
                    />
                  ) : null}
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-600 dark:text-zinc-300">Tone</label>
                  <select
                    className="w-full rounded-xl border border-zinc-300 bg-white p-2.5 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                    value={tone}
                    onChange={(e) => setTone(e.target.value as (typeof tones)[number])}
                  >
                    {tones.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm text-zinc-600 dark:text-zinc-300">Language</label>
                  <select
                    className="w-full max-w-md rounded-xl border border-zinc-300 bg-white p-2.5 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                className="mt-4 rounded-xl bg-purple-600 px-5 py-2.5 font-medium text-white hover:bg-purple-500 disabled:opacity-70"
                disabled={isLoading}
                onClick={handleGenerate}
              >
                {isLoading ? "Generating..." : "Generate captions"}
              </button>

              {usageText ? <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">{usageText}</p> : null}
              {error ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p> : null}

              <div className="mt-4">
                <BestTimeCard platform={platform === "Custom" ? platformCustom || "Instagram" : platform} />
              </div>
            </div>

            {captions.length > 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold">Your captions</h2>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
                      onClick={copyAll}
                    >
                      Copy all
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
                      onClick={downloadTxt}
                    >
                      Download .txt
                    </button>
                  </div>
                </div>
                <ul className="space-y-4">
                  {captions.map((caption, index) => (
                    <li
                      key={`${caption}-${index}`}
                      className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <p className="leading-7 text-zinc-800 dark:text-zinc-200">{caption}</p>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
                            onClick={() => handleCopy(caption, index)}
                          >
                            {copiedIndex === index ? "Copied" : "Copy"}
                          </button>
                          <button
                            type="button"
                            title="Favorite"
                            className="text-lg leading-none text-zinc-500 hover:text-amber-500 dark:text-zinc-400"
                            onClick={() => toggleFavorite(index)}
                            aria-label={fav[index] ? "Remove favorite" : "Add favorite"}
                          >
                            {fav[index] ? "★" : "☆"}
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-zinc-500">{caption.length} characters</p>
                      {emojiPerCaption[index]?.length ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {emojiPerCaption[index]!.map((em) => (
                            <span key={em} className="text-lg">
                              {em}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="text-xs font-medium text-zinc-500">Rate:</span>
                        {(
                          [
                            ["worst", "Worst"],
                            ["medium", "Medium"],
                            ["best", "Best"],
                          ] as const
                        ).map(([key, label]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setRating(index, key)}
                            className={`rounded-lg border px-2 py-1 text-xs font-medium ${
                              ratings[index] === key
                                ? key === "worst"
                                  ? "border-red-600 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-950/50 dark:text-red-300"
                                  : key === "medium"
                                    ? "border-amber-500 bg-amber-50 text-amber-800 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-200"
                                    : "border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-200"
                                : "border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : null}

        {tab === "hashtags" ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/80">
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              Generate hashtag sets from your topic (uses your platform when not Custom).
            </p>
            <button
              type="button"
              className="rounded-xl bg-purple-600 px-5 py-2.5 font-medium text-white disabled:opacity-50"
              disabled={htLoading || !topic.trim()}
              onClick={runHashtags}
            >
              {htLoading ? "Generating…" : "Generate hashtags"}
            </button>
            {htags.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {htags.map((h) => (
                  <li key={h} className="rounded-full bg-zinc-100 px-3 py-1 text-sm dark:bg-zinc-800">
                    {h}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {tab === "bio" ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/80">
            <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
              Describe yourself or your brand in the topic field above, then generate a profile bio.
            </p>
            <button
              type="button"
              className="rounded-xl bg-purple-600 px-5 py-2.5 font-medium text-white disabled:opacity-50"
              disabled={bioLoading || !topic.trim()}
              onClick={runBio}
            >
              {bioLoading ? "Writing…" : "Generate bio"}
            </button>
            {bio ? (
              <p className="mt-4 whitespace-pre-wrap rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100">
                {bio}
              </p>
            ) : null}
          </div>
        ) : null}

        {tab === "trending" ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/80">
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">Ideas refreshed periodically — tap one to paste into topic.</p>
            {trLoading ? (
              <p className="text-zinc-500">Loading trends…</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {trending.map((t) => (
                  <li key={t}>
                    <button
                      type="button"
                      className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-left text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                      onClick={() => {
                        setTopic(t);
                        setTab("captions");
                      }}
                    >
                      {t}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {tab === "ab" ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/80">
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              Generate two variants, track which one you posted for learning over time.
            </p>
            <button
              type="button"
              className="rounded-xl bg-purple-600 px-5 py-2.5 font-medium text-white disabled:opacity-50"
              disabled={abLoading || !topic.trim()}
              onClick={generateAbPair}
            >
              {abLoading ? "Generating…" : "Generate A/B pair"}
            </button>
            {abA && abB ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                  <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">Variant A</p>
                  <p className="mt-2 text-zinc-800 dark:text-zinc-200">{abA}</p>
                </div>
                <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                  <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">Variant B</p>
                  <p className="mt-2 text-zinc-800 dark:text-zinc-200">{abB}</p>
                </div>
                <button
                  type="button"
                  className="rounded-xl border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
                  onClick={saveAbExperiment}
                >
                  Save experiment
                </button>
                {abExpId ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-xl bg-zinc-800 px-4 py-2 text-sm text-white dark:bg-zinc-700"
                      onClick={() => pickAb("a")}
                    >
                      A performed better
                    </button>
                    <button
                      type="button"
                      className="rounded-xl bg-zinc-800 px-4 py-2 text-sm text-white dark:bg-zinc-700"
                      onClick={() => pickAb("b")}
                    >
                      B performed better
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <CaptionHistorySection refreshKey={historyKey} />
      </div>

      {showPaywall ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-6 text-center text-white">
            <h3 className="text-2xl font-semibold">Free Limit Reached</h3>
            <p className="mt-2 text-zinc-300">
              You have used all {freeLimit} free captions for today. Upgrade to Pro for unlimited usage.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                className="rounded-md border border-zinc-600 px-4 py-2 hover:bg-zinc-800"
                onClick={() => setShowPaywall(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="inline-flex min-w-[160px] items-center justify-center rounded-full bg-purple-600 px-6 py-3 text-base font-bold text-white disabled:opacity-50"
                disabled={checkoutLoading}
                onClick={() => startCheckout("month")}
              >
                {checkoutLoading ? "Opening Stripe…" : "Upgrade monthly"}
              </button>
              <button
                type="button"
                className="inline-flex min-w-[160px] items-center justify-center rounded-full border border-purple-400 px-6 py-3 text-base font-bold text-purple-100 disabled:opacity-50"
                disabled={checkoutLoading}
                onClick={() => startCheckout("year")}
              >
                {checkoutLoading ? "…" : "$79/year"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
