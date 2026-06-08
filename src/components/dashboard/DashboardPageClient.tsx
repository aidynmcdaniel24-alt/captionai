"use client";

import {
  AbPastWinners,
  type AbExperimentRow,
  type AbWinnerMetric,
} from "@/components/dashboard/AbPastWinners";
import { AnalyticsTab } from "@/components/dashboard/AnalyticsTab";
import { CalendarTab } from "@/components/dashboard/CalendarTab";
import { EmojisTab } from "@/components/dashboard/EmojisTab";
import { GraderTab } from "@/components/dashboard/GraderTab";
import { HashtagAnalyzerTab } from "@/components/dashboard/HashtagAnalyzerTab";
import { RewriterTab } from "@/components/dashboard/RewriterTab";
import { BrandLogo } from "@/components/BrandLogo";
import { CaptionLoadingState } from "@/components/dashboard/CaptionLoadingState";
import { CollectionsTab } from "@/components/dashboard/CollectionsTab";
import { GeneratedCaptionsPanel } from "@/components/dashboard/GeneratedCaptionsPanel";
import { HookLibraryTab } from "@/components/dashboard/HookLibraryTab";
import { ImageUploader } from "@/components/dashboard/ImageUploader";
import { IndustryTemplates } from "@/components/dashboard/IndustryTemplates";
import { InstallAppButton } from "@/components/pwa/InstallAppButton";
import { TokenBalance } from "@/components/dashboard/TokenBalance";
import { TokenCounter } from "@/components/dashboard/TokenCounter";
import { TokenUpgradeModal } from "@/components/dashboard/TokenUpgradeModal";
import type { CaptionRatingKey } from "@/lib/caption-rating-styles";
import type { CaptionScore } from "@/lib/caption-score";
import { isAnnualPlan, isProPlan } from "@/lib/plan";
import {
  lowTokenWarningThreshold,
  TOKEN_COSTS,
  type TokenInfo,
} from "@/lib/tokens-shared";
import {
  hasSeenOnboarding,
  WelcomeOnboardingModal,
} from "@/components/dashboard/WelcomeOnboardingModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const PLATFORM_PLACEHOLDER = "e.g. Instagram, TikTok, LinkedIn";
const TONE_PLACEHOLDER = "e.g. funny, professional, hype, inspirational";

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

type Tab =
  | "captions"
  | "rewriter"
  | "emojis"
  | "hashtagAnalyzer"
  | "grader"
  | "calendar"
  | "hashtags"
  | "bio"
  | "trending"
  | "ab"
  | "favorites"
  | "hookLibrary"
  | "analytics"
  | "collections";

type FavoriteHistoryItem = {
  id: string;
  topic: string;
  platform: string;
  tone: string;
  language?: string;
  captions: string[];
  created_at: string;
  favoriteIndexes: number[];
};

type TrendingCategory = {
  key: string;
  label: string;
  icon: string;
  topics: string[];
};

const TRENDING_PLATFORMS = [
  "Instagram",
  "TikTok",
  "LinkedIn",
  "Twitter/X",
  "Facebook",
  "YouTube",
  "Pinterest",
  "Threads",
] as const;

const AB_METRIC_OPTIONS: {
  value: AbWinnerMetric;
  label: string;
  icon: string;
}[] = [
  { value: "likes", label: "More likes", icon: "❤️" },
  { value: "comments", label: "More comments", icon: "💬" },
  { value: "shares", label: "More shares", icon: "🔁" },
  { value: "profile_visits", label: "More profile visits", icon: "👤" },
  { value: "reach", label: "Higher reach", icon: "📈" },
];


type PaywallPayload = {
  paywall?: boolean;
  resetAt?: string;
  cost?: number;
  tokensRemaining?: number;
  tokensLimit?: number;
};

type ApiResult = {
  captions?: string[];
  emojiPerCaption?: string[][];
  captionRatings?: CaptionRatingKey[];
  captionScores?: CaptionScore[];
  historyId?: string;
  plan?: "free" | "pro" | "annual";
  proBoost?: boolean;
  qualityTier?: "standard" | "pro" | "elite";
  brandToneActive?: boolean;
  tokens?: TokenInfo;
  error?: string;
  details?: string;
  stage?: string;
} & PaywallPayload;

export function DashboardPageClient() {
  const [tab, setTab] = useState<Tab>("captions");
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("");
  const [tone, setTone] = useState("");
  const [language, setLanguage] = useState("English");
  const [captions, setCaptions] = useState<string[]>([]);
  const [emojiPerCaption, setEmojiPerCaption] = useState<string[][]>([]);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [plan, setPlan] = useState<"free" | "pro" | "annual" | null>(null);
  const [tokensUsed, setTokensUsed] = useState<number | null>(null);
  const [tokensLimit, setTokensLimit] = useState<number | null>(null);
  const [tokensRemaining, setTokensRemaining] = useState<number | null>(null);
  const [resetAt, setResetAt] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [captionRatings, setCaptionRatings] = useState<CaptionRatingKey[]>([]);
  const [captionScores, setCaptionScores] = useState<CaptionScore[]>([]);
  const [proBoost, setProBoost] = useState(false);
  const [qualityTier, setQualityTier] = useState<"standard" | "pro" | "elite">("standard");
  const [brandToneActive, setBrandToneActive] = useState(false);
  const [fav, setFav] = useState<Record<number, boolean>>({});

  // Image-to-caption (Feature 3)
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageAnalyzing, setImageAnalyzing] = useState(false);

  // Hashtags tab
  const [htags, setHtags] = useState<string[]>([]);
  const [htLoading, setHtLoading] = useState(false);
  // Bio tab
  const [bio, setBio] = useState("");
  const [bioLoading, setBioLoading] = useState(false);
  // Trending
  const [trendingCategories, setTrendingCategories] = useState<TrendingCategory[]>([]);
  const [trendingPlatform, setTrendingPlatform] = useState("Instagram");
  const [trendingGeneratedAt, setTrendingGeneratedAt] = useState<number | null>(null);
  const [trLoading, setTrLoading] = useState(false);
  const [trendingLoaded, setTrendingLoaded] = useState(false);
  // A/B
  const [abA, setAbA] = useState("");
  const [abB, setAbB] = useState("");
  const [abStyleA, setAbStyleA] = useState<string | null>(null);
  const [abStyleB, setAbStyleB] = useState<string | null>(null);
  const [abExpId, setAbExpId] = useState<string | null>(null);
  const [abLoading, setAbLoading] = useState(false);
  const [abWinnerSide, setAbWinnerSide] = useState<"a" | "b" | null>(null);
  const [abMetricSaving, setAbMetricSaving] = useState(false);
  const [abWinnerSaved, setAbWinnerSaved] = useState(false);
  const [abPastWinners, setAbPastWinners] = useState<AbExperimentRow[]>([]);
  const [abPastLoading, setAbPastLoading] = useState(false);
  const [abPastLoaded, setAbPastLoaded] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteHistoryItem[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);

  const shell =
    "min-h-screen bg-zinc-50 text-zinc-900 dark:bg-gradient-to-b dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 dark:text-white";

  const resolvedTone = tone.trim().slice(0, 80) || "inspirational";
  const resolvedPlatform = platform.trim().slice(0, 80) || "Instagram";

  const applyTokenInfo = useCallback((info?: TokenInfo | null) => {
    if (!info) return;
    if (info.plan === "free" || info.plan === "pro" || info.plan === "annual") {
      setPlan(info.plan);
    }
    if (typeof info.tokensUsed === "number") setTokensUsed(info.tokensUsed);
    setTokensLimit(info.tokensLimit ?? null);
    if (typeof info.tokensRemaining === "number" || info.tokensRemaining === null) {
      setTokensRemaining(info.tokensRemaining ?? null);
    }
  }, []);

  const refreshPlan = useCallback(async () => {
    try {
      const res = await fetch("/api/profile/stats");
      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as {
        plan?: string;
        tokensUsed?: number;
        tokensLimit?: number | null;
        tokensRemaining?: number | null;
        resetAt?: string;
      };
      const planValue: "free" | "pro" | "annual" =
        data.plan === "annual" ? "annual" : data.plan === "pro" ? "pro" : "free";
      setPlan(planValue);
      if (typeof data.tokensUsed === "number") setTokensUsed(data.tokensUsed);
      // The API now returns the correct per-plan limit (200 free, 1000 pro,
      // null for annual/admin) — trust it directly.
      setTokensLimit(data.tokensLimit ?? null);
      if (
        typeof data.tokensRemaining === "number" ||
        data.tokensRemaining === null
      ) {
        setTokensRemaining(data.tokensRemaining ?? null);
      }
      if (data.resetAt) setResetAt(data.resetAt);
    } catch {
      /* ignore */
    }
  }, []);

  /**
   * Pre-flight check for any token-spending action. Annual (and admin)
   * accounts have a null limit and always pass. Free (200/day) and Pro
   * (1000/day) users with insufficient tokens trigger the upgrade modal and
   * the caller short-circuits without firing the API call.
   */
  const ensureTokensOrShowModal = useCallback(
    (cost: number, message?: string): boolean => {
      if (tokensRemaining === null || tokensLimit === null) {
        return true;
      }
      if (tokensRemaining < cost) {
        setUpgradeMessage(message ?? null);
        setShowUpgradeModal(true);
        return false;
      }
      return true;
    },
    [tokensLimit, tokensRemaining]
  );

  const handleTokenPaywall = useCallback(
    (data: PaywallPayload) => {
      if (typeof data.tokensRemaining === "number") {
        setTokensRemaining(data.tokensRemaining);
      }
      if (typeof data.tokensLimit === "number") {
        setTokensLimit(data.tokensLimit);
      }
      if (data.resetAt) setResetAt(data.resetAt);
      setUpgradeMessage(null);
      setShowUpgradeModal(true);
    },
    []
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate plan/usage on mount
    void refreshPlan();
  }, [refreshPlan]);

  useEffect(() => {
    if (!hasSeenOnboarding()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reveal modal once localStorage available on mount
      setShowOnboarding(true);
    }
  }, []);

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

  function isBestLockedForFree(index: number) {
    return !isProPlan(plan) && captionRatings[index] === "best";
  }

  function captionsForExport(): string[] {
    return captions.filter((_, i) => !isBestLockedForFree(i));
  }

  async function handleGenerate() {
    if (!ensureTokensOrShowModal(TOKEN_COSTS.caption)) return;
    setError("");
    setIsLoading(true);
    setCaptionRatings([]);
    setCaptionScores([]);
    setProBoost(false);
    setQualityTier("standard");
    setBrandToneActive(false);
    setFav({});

    try {
      const res = await fetch("/api/captions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          platform: resolvedPlatform,
          tone: resolvedTone,
          language,
        }),
      });

      const data = (await res.json()) as ApiResult;

      if (!res.ok) {
        if (data.paywall) {
          handleTokenPaywall(data);
          setCaptions([]);
          setEmojiPerCaption([]);
          setCaptionRatings([]);
          setHistoryId(null);
          return;
        }

        const fullError = [data.error, data.stage ? `(stage: ${data.stage})` : null, data.details]
          .filter(Boolean)
          .join(" ");
        setError(fullError || "Something went wrong.");
        return;
      }

      setCaptions(data.captions ?? []);
      setEmojiPerCaption(data.emojiPerCaption ?? []);
      setCaptionRatings(data.captionRatings ?? []);
      setCaptionScores(data.captionScores ?? []);
      setHistoryId(data.historyId ?? null);
      setProBoost(Boolean(data.proBoost));
      setQualityTier(data.qualityTier ?? (data.plan === "annual" ? "elite" : data.plan === "pro" ? "pro" : "standard"));
      setBrandToneActive(Boolean(data.brandToneActive));
      if (data.plan === "annual" || data.plan === "pro" || data.plan === "free") {
        setPlan(data.plan);
      }
      applyTokenInfo(data.tokens);
      await refreshPlan();
    } catch {
      setError("Could not generate captions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy(caption: string, index: number) {
    if (isBestLockedForFree(index)) {
      setError("Upgrade to Pro to copy your Best-rated caption.");
      return;
    }
    setError("");
    await navigator.clipboard.writeText(caption);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);

    // Caption Memory: fire-and-forget copy tracking for Pro+ users.
    if (isProPlan(plan)) {
      void fetch("/api/captions/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          captionText: caption,
          platform: resolvedPlatform,
          tone: resolvedTone,
          topic,
          score: captionScores[index]?.total ?? null,
        }),
      });
    }
  }

  async function copyAll() {
    if (captions.length === 0) {
      return;
    }
    const lines = captionsForExport();
    if (lines.length === 0) {
      return;
    }
    await navigator.clipboard.writeText(lines.join("\n\n"));
  }

  function downloadTxt() {
    if (captions.length === 0) {
      return;
    }
    const lines = captionsForExport();
    if (lines.length === 0) {
      return;
    }
    const blob = new Blob([lines.join("\n\n")], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "captionai-captions.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function toggleFavorite(index: number) {
    const on = !fav[index];
    setFav((f) => ({ ...f, [index]: on }));
    if (!historyId) {
      return;
    }
    try {
      const res = await fetch("/api/captions/favorite", {
        method: on ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historyId, captionIndex: index }),
      });
      if (!res.ok) {
        setFav((f) => ({ ...f, [index]: !on }));
        const data = (await res.json()) as { error?: string };
        setError(data.error || "Could not update favorite.");
      }
    } catch {
      setFav((f) => ({ ...f, [index]: !on }));
      setError("Could not update favorite.");
    }
  }

  async function runHashtags() {
    if (!ensureTokensOrShowModal(TOKEN_COSTS.hashtag)) return;
    setHtLoading(true);
    setHtags([]);
    setError("");
    try {
      const res = await fetch("/api/tools/hashtags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          platform: resolvedPlatform,
          count: 15,
        }),
      });
      const data = (await res.json()) as {
        hashtags?: string[];
        tokens?: TokenInfo;
        error?: string;
      } & PaywallPayload;
      if (!res.ok) {
        if (data.paywall) {
          handleTokenPaywall(data);
          return;
        }
        setError(data.error || "Hashtag generation failed.");
        return;
      }
      setHtags(data.hashtags ?? []);
      applyTokenInfo(data.tokens);
    } catch {
      setError("Network error.");
    } finally {
      setHtLoading(false);
    }
  }

  async function runBio() {
    if (!ensureTokensOrShowModal(TOKEN_COSTS.bio)) return;
    setBioLoading(true);
    setBio("");
    setError("");
    try {
      const res = await fetch("/api/tools/bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          about: topic,
          platform: resolvedPlatform,
          tone: resolvedTone,
        }),
      });
      const data = (await res.json()) as {
        bio?: string;
        tokens?: TokenInfo;
        error?: string;
      } & PaywallPayload;
      if (!res.ok) {
        if (data.paywall) {
          handleTokenPaywall(data);
          return;
        }
        setError(data.error || "Bio generation failed.");
        return;
      }
      if (data.bio) {
        setBio(data.bio);
      }
      applyTokenInfo(data.tokens);
    } catch {
      setError("Network error.");
    } finally {
      setBioLoading(false);
    }
  }

  const loadTrending = useCallback(
    async (opts?: { platform?: string; refresh?: boolean }) => {
      if (!ensureTokensOrShowModal(TOKEN_COSTS.trending)) {
        setTrendingLoaded(true);
        return;
      }
      const targetPlatform = (opts?.platform ?? trendingPlatform).trim() || "Instagram";
      setTrLoading(true);
      setError("");
      try {
        const url = new URL("/api/trending", window.location.origin);
        url.searchParams.set("platform", targetPlatform);
        if (opts?.refresh) url.searchParams.set("refresh", "1");
        const res = await fetch(url.pathname + url.search);
        const data = (await res.json()) as {
          categories?: TrendingCategory[];
          generatedAt?: number;
          platform?: string;
          tokens?: TokenInfo;
          error?: string;
        } & PaywallPayload;
        if (!res.ok) {
          if (data.paywall) {
            handleTokenPaywall(data);
            setTrendingCategories([]);
            return;
          }
          setTrendingCategories([]);
          setError(data.error || "Could not load trending topics.");
          return;
        }
        setTrendingCategories(data.categories ?? []);
        setTrendingGeneratedAt(data.generatedAt ?? Date.now());
        if (data.platform) setTrendingPlatform(data.platform);
        applyTokenInfo(data.tokens);
      } catch {
        setTrendingCategories([]);
        setError("Could not load trending topics.");
      } finally {
        setTrLoading(false);
        setTrendingLoaded(true);
      }
    },
    [
      applyTokenInfo,
      ensureTokensOrShowModal,
      handleTokenPaywall,
      trendingPlatform,
    ]
  );

  useEffect(() => {
    if (tab === "trending" && !trendingLoaded && !trLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- load trending when tab opens
      void loadTrending();
    }
  }, [tab, trendingLoaded, trLoading, loadTrending]);

  async function generateAbPair() {
    if (!ensureTokensOrShowModal(TOKEN_COSTS.abTest)) return;
    setAbLoading(true);
    setAbA("");
    setAbB("");
    setAbStyleA(null);
    setAbStyleB(null);
    setAbExpId(null);
    setAbWinnerSide(null);
    setAbWinnerSaved(false);
    setError("");
    try {
      const res = await fetch("/api/tools/ab-pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          platform: resolvedPlatform,
          tone: resolvedTone,
        }),
      });
      const data = (await res.json()) as {
        a?: string;
        b?: string;
        styleA?: string;
        styleB?: string;
        tokens?: TokenInfo;
        error?: string;
      } & PaywallPayload;
      if (!res.ok) {
        if (data.paywall) {
          handleTokenPaywall(data);
          return;
        }
        setError(data.error || "Could not generate pair.");
        return;
      }
      setAbA(data.a ?? "");
      setAbB(data.b ?? "");
      setAbStyleA(data.styleA ?? null);
      setAbStyleB(data.styleB ?? null);
      applyTokenInfo(data.tokens);
    } catch {
      setError("Network error.");
    } finally {
      setAbLoading(false);
    }
  }

  async function saveAbWinner(side: "a" | "b", metric: AbWinnerMetric) {
    if (!abExpId) return;
    setAbMetricSaving(true);
    setError("");
    try {
      const style = side === "a" ? abStyleA : abStyleB;
      const res = await fetch("/api/ab-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "winner",
          id: abExpId,
          winner: side,
          metric,
          style,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error || "Could not save winner.");
        return;
      }
      setAbWinnerSaved(true);
      setAbPastLoaded(false);
    } catch {
      setError("Could not save winner.");
    } finally {
      setAbMetricSaving(false);
    }
  }

  const loadAbPastWinners = useCallback(async () => {
    setAbPastLoading(true);
    try {
      const res = await fetch("/api/ab-test");
      if (!res.ok) return;
      const data = (await res.json()) as { items?: AbExperimentRow[] };
      setAbPastWinners((data.items ?? []).filter((row) => row.winner !== null));
    } catch {
      /* ignore */
    } finally {
      setAbPastLoading(false);
      setAbPastLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (tab === "ab" && !abPastLoaded && !abPastLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- load past A/B winners when tab opens
      void loadAbPastWinners();
    }
  }, [tab, abPastLoaded, abPastLoading, loadAbPastWinners]);

  // Image-to-caption upload handler (Feature 3). Sends a base64-encoded
  // image to the backend, which calls Groq vision and returns a topic
  // description. Costs an extra 5 tokens for free users.
  async function handleImageUpload(file: File) {
    if (!ensureTokensOrShowModal(TOKEN_COSTS.image)) return;
    setError("");
    setImageAnalyzing(true);
    try {
      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      setImagePreview(dataUrl);

      const res = await fetch("/api/captions/describe-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: dataUrl, mimeType: file.type }),
      });
      const data = (await res.json()) as {
        description?: string;
        tokens?: TokenInfo;
        error?: string;
      } & PaywallPayload;
      if (!res.ok) {
        if (data.paywall) {
          handleTokenPaywall(data);
          setImagePreview(null);
          return;
        }
        setError(data.error || "Could not analyze your image.");
        setImagePreview(null);
        return;
      }
      if (data.description) {
        setTopic(data.description);
      }
      applyTokenInfo(data.tokens);
    } catch {
      setError("Could not analyze your image.");
      setImagePreview(null);
    } finally {
      setImageAnalyzing(false);
    }
  }

  function handleImageRemove() {
    setImagePreview(null);
  }

  async function saveAbExperiment() {
    if (!abA.trim() || !abB.trim()) {
      return;
    }
    setError("");
    try {
      const res = await fetch("/api/ab-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          variantA: abA,
          variantB: abB,
          label: topic.slice(0, 80),
          platform: resolvedPlatform,
          styleA: abStyleA,
          styleB: abStyleB,
        }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (res.ok && data.id) {
        setAbExpId(data.id);
        return;
      }
      setError(data.error || "Could not save A/B experiment.");
    } catch {
      setError("Could not save A/B experiment.");
    }
  }

  const loadFavorites = useCallback(async () => {
    setFavoritesLoading(true);
    setError("");
    try {
      const res = await fetch("/api/captions/history");
      const data = (await res.json()) as { items?: FavoriteHistoryItem[]; error?: string };
      if (!res.ok) {
        setFavorites([]);
        setError(data.error || "Could not load favorites.");
        return;
      }
      const onlyFavorites = (data.items ?? []).filter(
        (item) => Array.isArray(item.favoriteIndexes) && item.favoriteIndexes.length > 0
      );
      setFavorites(onlyFavorites);
    } catch {
      setFavorites([]);
      setError("Could not load favorites.");
    } finally {
      setFavoritesLoading(false);
      setFavoritesLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (tab === "favorites" && !favoritesLoaded && !favoritesLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- load favorites when tab opens
      void loadFavorites();
    }
  }, [tab, favoritesLoaded, favoritesLoading, loadFavorites]);

  async function unfavoriteSaved(historyId: string, captionIndex: number) {
    setError("");
    const previous = favorites;
    setFavorites((prev) =>
      prev
        .map((item) =>
          item.id === historyId
            ? { ...item, favoriteIndexes: item.favoriteIndexes.filter((i) => i !== captionIndex) }
            : item
        )
        .filter((item) => item.favoriteIndexes.length > 0)
    );
    try {
      const res = await fetch("/api/captions/favorite", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historyId, captionIndex }),
      });
      if (!res.ok) {
        setFavorites(previous);
        const data = (await res.json()) as { error?: string };
        setError(data.error || "Could not remove favorite.");
      }
    } catch {
      setFavorites(previous);
      setError("Could not remove favorite.");
    }
  }

  // Low-balance banner for metered plans. Free (<50 left) upsells Pro;
  // Pro (<200 left) upsells Annual. Annual/admin (null limit) never warn.
  const lowTokens =
    (plan === "free" || plan === "pro") &&
    tokensRemaining !== null &&
    tokensLimit !== null &&
    tokensRemaining > 0 &&
    tokensRemaining <= lowTokenWarningThreshold(plan);

  return (
    <main className={`${shell} px-4 py-6 sm:px-6 sm:py-8`}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 sm:gap-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm backdrop-blur sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/"
                className="shrink-0 rounded-lg outline-none ring-offset-2 ring-offset-white focus-visible:ring-2 focus-visible:ring-purple-500 dark:ring-offset-zinc-900"
                aria-label="CaptionAI home"
              >
                <BrandLogo className="h-9 w-9" />
              </Link>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-600 sm:text-xs dark:text-purple-300">
                  CaptionAI
                </p>
                <h1 className="truncate text-xl font-semibold sm:text-3xl">AI Caption Studio</h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:hidden">
              <ThemeToggle />
              <UserButton userProfileUrl="/settings" userProfileMode="navigation" />
            </div>
          </div>

          {plan === "free" ? (
            <button
              type="button"
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-purple-500 disabled:opacity-50 sm:hidden"
              disabled={checkoutLoading}
              onClick={() => startCheckout("month")}
            >
              {checkoutLoading ? "Opening checkout…" : "Upgrade — $9/mo"}
            </button>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <TokenBalance
              plan={plan}
              tokensUsed={tokensUsed}
              tokensLimit={tokensLimit}
              tokensRemaining={tokensRemaining}
            />
            <InstallAppButton />
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            {plan === "free" ? (
              <button
                type="button"
                className="hidden min-h-[44px] items-center justify-center rounded-full bg-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-purple-500 disabled:opacity-50 sm:inline-flex"
                disabled={checkoutLoading}
                onClick={() => startCheckout("month")}
              >
                {checkoutLoading ? "Opening checkout…" : "Upgrade — $9/mo"}
              </button>
            ) : null}
            <Link
              href="/history"
              className="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 sm:flex-none dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              History
            </Link>
            <Link
              href="/profile"
              className="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 sm:flex-none dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Profile
            </Link>
            <Link
              href="/affiliate"
              className="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 sm:flex-none dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Affiliate
            </Link>
            <div className="hidden sm:block">
              <UserButton userProfileUrl="/settings" userProfileMode="navigation" />
            </div>
          </div>
        </div>

        {lowTokens ? (
          <div
            className="flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100"
            role="status"
          >
            <span>
              ⚠️ Running low on tokens! Only{" "}
              <span className="font-semibold tabular-nums">{tokensRemaining}</span> of{" "}
              {tokensLimit ?? 200} left today.
            </span>
            <button
              type="button"
              onClick={() => startCheckout(plan === "pro" ? "year" : "month")}
              disabled={checkoutLoading}
              className="inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-full bg-amber-900 px-4 py-1.5 text-xs font-semibold text-amber-50 transition hover:bg-amber-950 disabled:opacity-50"
            >
              {plan === "pro" ? "Upgrade to Annual" : "Upgrade to Pro"}
            </button>
          </div>
        ) : null}

        <div
          className="-mx-1 overflow-x-auto rounded-2xl border border-zinc-200 bg-white p-2 hide-scrollbar dark:border-zinc-800 dark:bg-zinc-900/60"
          role="tablist"
          aria-label="Studio sections"
        >
          <div className="flex min-w-max gap-1.5 sm:gap-2">
            {(
              [
                ["captions", "Captions", "free" as const],
                ["rewriter", "Rewriter", "pro" as const],
                ["emojis", "Emojis", "pro" as const],
                ["hashtagAnalyzer", "Hashtags+", "annual" as const],
                ["grader", "Grader", "annual" as const],
                ["calendar", "Calendar", "annual" as const],
                ["hashtags", "Hashtags", "free" as const],
                ["bio", "Bio", "free" as const],
                ["trending", "Trending", "free" as const],
                ["ab", "A/B test", "free" as const],
                ["favorites", "Favorites", "free" as const],
                ["collections", "Collections", "pro" as const],
                ["hookLibrary", "Hook Library", "free" as const],
                ["analytics", "Analytics", "pro" as const],
              ] as const
            ).map(([id, label, tier]) => {
              const locked =
                tier === "pro"
                  ? !isProPlan(plan)
                  : tier === "annual"
                    ? !isAnnualPlan(plan)
                    : false;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition ${
                    tab === id
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  {label}
                  {locked ? (
                    <span aria-hidden className="text-[11px] opacity-70">
                      🔒
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {error ? (
          <p
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {tab === "captions" ? (
          <>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/80">
              <IndustryTemplates topic={topic} onPick={setTopic} />

              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <label className="block text-sm text-zinc-600 dark:text-zinc-300">
                  Photo/topic description
                </label>
                <ImageUploader
                  preview={imagePreview}
                  analyzing={imageAnalyzing}
                  cost={TOKEN_COSTS.image}
                  isPro={isProPlan(plan)}
                  onUpload={handleImageUpload}
                  onRemove={handleImageRemove}
                />
              </div>
              <textarea
                className="min-h-32 w-full rounded-xl border border-zinc-300 bg-white p-3 text-base text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                placeholder="Example: my coffee shop in New Orleans"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-zinc-600 dark:text-zinc-300">Platform</label>
                  <input
                    type="text"
                    className="block min-h-[48px] w-full rounded-xl border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                    placeholder={PLATFORM_PLACEHOLDER}
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    maxLength={80}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-600 dark:text-zinc-300">Tone</label>
                  <input
                    type="text"
                    className="block min-h-[48px] w-full rounded-xl border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                    placeholder={TONE_PLACEHOLDER}
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    maxLength={80}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm text-zinc-600 dark:text-zinc-300">Language</label>
                  <select
                    className="block min-h-[48px] w-full max-w-md rounded-xl border border-zinc-300 bg-white px-3 text-base dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
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

              <div className="mt-5 flex flex-col gap-2">
                <button
                  className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-purple-600 px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-purple-500 disabled:opacity-70 sm:w-auto"
                  disabled={isLoading}
                  onClick={handleGenerate}
                >
                  {isLoading ? "Generating..." : "Generate captions"}
                </button>
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  {isProPlan(plan) ? (
                    <span
                      title="Pro and Annual subscribers get priority placement in the AI generation queue."
                      className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-300"
                    >
                      <span aria-hidden>⚡</span>
                      <span>{isAnnualPlan(plan) ? "Elite priority" : "Priority generation"}</span>
                    </span>
                  ) : (
                    <span aria-hidden />
                  )}
                  <TokenCounter
                    plan={plan}
                    tokensRemaining={tokensRemaining}
                    tokensLimit={tokensLimit}
                  />
                </div>
              </div>
            </div>

            {isLoading ? (
              <CaptionLoadingState
                subject={
                  isAnnualPlan(plan)
                    ? `👑 Elite generation for ${resolvedPlatform}`
                    : isProPlan(plan)
                      ? `⚡ Pro priority generation for ${resolvedPlatform}`
                      : `Generating for ${resolvedPlatform}`
                }
              />
            ) : null}

            {captions.length > 0 ? (
              <GeneratedCaptionsPanel
                captions={captions}
                captionRatings={captionRatings}
                captionScores={captionScores}
                emojiPerCaption={emojiPerCaption}
                historyId={historyId}
                platform={resolvedPlatform}
                tone={resolvedTone}
                topic={topic}
                plan={plan}
                proBoost={proBoost}
                qualityTier={qualityTier}
                brandToneActive={brandToneActive}
                copiedIndex={copiedIndex}
                fav={fav}
                checkoutLoading={checkoutLoading}
                onCopy={handleCopy}
                onToggleFavorite={toggleFavorite}
                onStartCheckout={startCheckout}
                onCopyAll={copyAll}
                onDownloadTxt={downloadTxt}
              />
            ) : null}

          </>
        ) : null}

        {tab === "rewriter" ? (
          <RewriterTab
            plan={plan}
            tokensRemaining={tokensRemaining}
            tokensLimit={tokensLimit}
            checkoutLoading={checkoutLoading}
            onStartCheckout={startCheckout}
            onApplyTokenInfo={applyTokenInfo}
          />
        ) : null}

        {tab === "emojis" ? (
          <EmojisTab
            plan={plan}
            tokensRemaining={tokensRemaining}
            tokensLimit={tokensLimit}
            checkoutLoading={checkoutLoading}
            onStartCheckout={startCheckout}
            onApplyTokenInfo={applyTokenInfo}
          />
        ) : null}

        {tab === "hashtagAnalyzer" ? (
          <HashtagAnalyzerTab
            plan={plan}
            tokensRemaining={tokensRemaining}
            tokensLimit={tokensLimit}
            checkoutLoading={checkoutLoading}
            onStartCheckout={startCheckout}
            onApplyTokenInfo={applyTokenInfo}
          />
        ) : null}

        {tab === "grader" ? (
          <GraderTab
            plan={plan}
            tokensRemaining={tokensRemaining}
            tokensLimit={tokensLimit}
            checkoutLoading={checkoutLoading}
            onStartCheckout={startCheckout}
            onApplyTokenInfo={applyTokenInfo}
          />
        ) : null}

        {tab === "calendar" ? (
          <CalendarTab
            plan={plan}
            tokensRemaining={tokensRemaining}
            tokensLimit={tokensLimit}
            checkoutLoading={checkoutLoading}
            onStartCheckout={startCheckout}
            onApplyTokenInfo={applyTokenInfo}
          />
        ) : null}

        {tab === "hashtags" ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/80">
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              Generate a mix of reach and niche hashtags tailored to your topic and platform.
            </p>

            <label className="mb-2 block text-sm text-zinc-600 dark:text-zinc-300">Topic</label>
            <textarea
              className="min-h-24 w-full rounded-xl border border-zinc-300 bg-white p-3 text-base text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              placeholder="Example: my coffee shop in New Orleans"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />

            <div className="mt-4">
              <label className="mb-2 block text-sm text-zinc-600 dark:text-zinc-300">Platform</label>
              <input
                type="text"
                className="block min-h-[48px] w-full max-w-md rounded-xl border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                placeholder={PLATFORM_PLACEHOLDER}
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                maxLength={80}
              />
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-purple-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-purple-500 disabled:opacity-50 sm:w-auto"
                disabled={htLoading || !topic.trim()}
                onClick={runHashtags}
              >
                {htLoading ? "Generating…" : "Generate hashtags"}
              </button>
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                {plan === "pro" ? (
                  <span
                    title="Pro subscribers get priority placement in the AI generation queue."
                    className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-300"
                  >
                    <span aria-hidden>⚡</span>
                    <span>Priority generation</span>
                  </span>
                ) : (
                  <span aria-hidden />
                )}
                <TokenCounter
                  plan={plan}
                  tokensRemaining={tokensRemaining}
                  tokensLimit={tokensLimit}
                />
              </div>
            </div>

            {htags.length > 0 ? (
              <div className="mt-6">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                    {htags.length} hashtags
                  </p>
                  <button
                    type="button"
                    className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    onClick={async () => {
                      await navigator.clipboard.writeText(htags.join(" "));
                    }}
                  >
                    Copy all
                  </button>
                </div>
                <ul className="flex flex-wrap gap-2">
                  {htags.map((h) => (
                    <li
                      key={h}
                      className="break-all rounded-full bg-purple-50 px-3 py-1.5 text-sm text-purple-800 dark:bg-purple-950/40 dark:text-purple-200"
                    >
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "bio" ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/80">
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              Describe yourself or your brand, pick a platform and tone, and we will write a profile bio.
            </p>

            <label className="mb-2 block text-sm text-zinc-600 dark:text-zinc-300">About you / your brand</label>
            <textarea
              className="min-h-24 w-full rounded-xl border border-zinc-300 bg-white p-3 text-base text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              placeholder="Example: indie game developer, makes cozy pixel-art puzzle games"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-zinc-600 dark:text-zinc-300">Platform</label>
                <input
                  type="text"
                  className="block min-h-[48px] w-full rounded-xl border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                  placeholder={PLATFORM_PLACEHOLDER}
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  maxLength={80}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-zinc-600 dark:text-zinc-300">Tone</label>
                <input
                  type="text"
                  className="block min-h-[48px] w-full rounded-xl border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                  placeholder={TONE_PLACEHOLDER}
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  maxLength={80}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-purple-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-purple-500 disabled:opacity-50 sm:w-auto"
                disabled={bioLoading || !topic.trim()}
                onClick={runBio}
              >
                {bioLoading ? "Writing…" : "Generate bio"}
              </button>
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                {plan === "pro" ? (
                  <span
                    title="Pro subscribers get priority placement in the AI generation queue."
                    className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-300"
                  >
                    <span aria-hidden>⚡</span>
                    <span>Priority generation</span>
                  </span>
                ) : (
                  <span aria-hidden />
                )}
                <TokenCounter
                  plan={plan}
                  tokensRemaining={tokensRemaining}
                  tokensLimit={tokensLimit}
                />
              </div>
            </div>

            {bio ? (
              <div className="mt-6">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Your bio</p>
                  <button
                    type="button"
                    className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    onClick={async () => {
                      await navigator.clipboard.writeText(bio);
                    }}
                  >
                    Copy
                  </button>
                </div>
                <p className="whitespace-pre-wrap break-words rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100">
                  {bio}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "trending" ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/80">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  Trending right now
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Tap any chip to drop it into your topic field and switch to Captions.
                  {trendingGeneratedAt ? (
                    <>
                      {" "}
                      <span className="text-xs text-zinc-500 dark:text-zinc-500">
                        Updated{" "}
                        {new Date(trendingGeneratedAt).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </>
                  ) : null}
                </p>
              </div>
              <button
                type="button"
                disabled={trLoading}
                onClick={() => void loadTrending({ refresh: true })}
                className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-purple-300 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-800 transition hover:bg-purple-100 disabled:opacity-50 dark:border-purple-700/60 dark:bg-purple-950/50 dark:text-purple-200 dark:hover:bg-purple-900/40"
              >
                <span aria-hidden>🔄</span>
                <span>{trLoading ? "Refreshing…" : "Refresh"}</span>
              </button>
            </div>

            <div className="mb-4 -mx-1 overflow-x-auto pb-1 hide-scrollbar">
              <div className="flex min-w-max gap-1.5 px-1" role="tablist" aria-label="Platforms">
                {TRENDING_PLATFORMS.map((p) => {
                  const active = trendingPlatform.toLowerCase() === p.toLowerCase();
                  return (
                    <button
                      key={p}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        setTrendingPlatform(p);
                        void loadTrending({ platform: p });
                      }}
                      className={`inline-flex min-h-[36px] shrink-0 items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "border-purple-500 bg-purple-600 text-white"
                          : "border-zinc-200 bg-white text-zinc-700 hover:border-purple-300 hover:bg-purple-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-purple-500/60 dark:hover:bg-purple-950/40"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {trLoading && trendingCategories.length === 0 ? (
              <p className="text-sm text-zinc-500">Loading trends…</p>
            ) : trendingCategories.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No trends yet. Tap Refresh to fetch fresh suggestions.
              </p>
            ) : (
              <div className="space-y-5">
                {trendingCategories.map((cat) => (
                  <section key={cat.key}>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
                      <span aria-hidden>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </h3>
                    <div className="-mx-1 flex flex-wrap gap-2 px-1">
                      {cat.topics.map((t) => (
                        <button
                          key={`${cat.key}-${t}`}
                          type="button"
                          onClick={() => {
                            setTopic(t);
                            if (!platform.trim()) {
                              setPlatform(trendingPlatform);
                            }
                            setTab("captions");
                          }}
                          className="inline-flex min-h-[36px] items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm font-medium text-zinc-800 transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-purple-500/60 dark:hover:bg-purple-950/40 dark:hover:text-purple-100"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {tab === "ab" ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/80">
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              Generate two caption variants for the same post and track which one performs better.
            </p>

            <label className="mb-2 block text-sm text-zinc-600 dark:text-zinc-300">Topic</label>
            <textarea
              className="min-h-24 w-full rounded-xl border border-zinc-300 bg-white p-3 text-base text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              placeholder="Example: launching a new fitness app for beginners"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-zinc-600 dark:text-zinc-300">Platform</label>
                <input
                  type="text"
                  className="block min-h-[48px] w-full rounded-xl border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                  placeholder={PLATFORM_PLACEHOLDER}
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  maxLength={80}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-zinc-600 dark:text-zinc-300">Tone</label>
                <input
                  type="text"
                  className="block min-h-[48px] w-full rounded-xl border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                  placeholder={TONE_PLACEHOLDER}
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  maxLength={80}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-purple-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-purple-500 disabled:opacity-50 sm:w-auto"
                disabled={abLoading || !topic.trim()}
                onClick={generateAbPair}
              >
                {abLoading ? "Generating…" : "Generate A/B pair"}
              </button>
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                {plan === "pro" ? (
                  <span
                    title="Pro subscribers get priority placement in the AI generation queue."
                    className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-300"
                  >
                    <span aria-hidden>⚡</span>
                    <span>Priority generation</span>
                  </span>
                ) : (
                  <span aria-hidden />
                )}
                <TokenCounter
                  plan={plan}
                  tokensRemaining={tokensRemaining}
                  tokensLimit={tokensLimit}
                />
              </div>
            </div>

            {abA && abB ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                      Variant A {abStyleA ? <span className="ml-1 text-[10px] font-medium normal-case tracking-normal text-purple-500 dark:text-purple-300">· {abStyleA}</span> : null}
                    </p>
                    <button
                      type="button"
                      className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      onClick={async () => {
                        await navigator.clipboard.writeText(abA);
                      }}
                    >
                      Copy
                    </button>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-zinc-800 dark:text-zinc-200">{abA}</p>
                </div>
                <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                      Variant B {abStyleB ? <span className="ml-1 text-[10px] font-medium normal-case tracking-normal text-purple-500 dark:text-purple-300">· {abStyleB}</span> : null}
                    </p>
                    <button
                      type="button"
                      className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      onClick={async () => {
                        await navigator.clipboard.writeText(abB);
                      }}
                    >
                      Copy
                    </button>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-zinc-800 dark:text-zinc-200">{abB}</p>
                </div>
                <button
                  type="button"
                  className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 sm:w-auto dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  onClick={saveAbExperiment}
                  disabled={Boolean(abExpId)}
                >
                  {abExpId ? "Experiment saved" : "Save experiment"}
                </button>

                {abExpId ? (
                  <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4 dark:border-purple-800/60 dark:bg-purple-950/20">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                      Mark winner
                    </p>
                    <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                      Once you&apos;ve posted both variants, come back and tell us which one performed better and how.
                    </p>

                    {abWinnerSaved ? (
                      <p className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                        ✓ Winner recorded. We&apos;ll factor this into your Past Winners insights below.
                      </p>
                    ) : abWinnerSide === null ? (
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500"
                          onClick={() => setAbWinnerSide("a")}
                        >
                          Variant A performed better
                        </button>
                        <button
                          type="button"
                          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500"
                          onClick={() => setAbWinnerSide("b")}
                        >
                          Variant B performed better
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm text-zinc-700 dark:text-zinc-200">
                          How did <span className="font-semibold">Variant {abWinnerSide.toUpperCase()}</span> perform better?
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {AB_METRIC_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              disabled={abMetricSaving}
                              onClick={() => saveAbWinner(abWinnerSide!, opt.value)}
                              className="inline-flex min-h-[44px] items-center justify-start gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 transition hover:border-purple-300 hover:bg-purple-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-purple-500/60 dark:hover:bg-purple-950/40"
                            >
                              <span aria-hidden>{opt.icon}</span>
                              <span>{opt.label}</span>
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="text-xs font-medium text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
                          onClick={() => setAbWinnerSide(null)}
                          disabled={abMetricSaving}
                        >
                          ← Change winner
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}

            <AbPastWinners
              rows={abPastWinners}
              loading={abPastLoading}
              loaded={abPastLoaded}
            />
          </div>
        ) : null}

        {tab === "favorites" ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/80">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Saved favorites</h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Captions you starred from past generations.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={`inline-flex min-h-[40px] items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    isProPlan(plan)
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950/60"
                      : "border-zinc-300 bg-zinc-100 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-500"
                  }`}
                  onClick={() => {
                    if (!isProPlan(plan)) {
                      setShowUpgradeModal(true);
                      return;
                    }
                    window.location.href = "/api/captions/favorites/export";
                  }}
                  title={!isProPlan(plan) ? "Pro feature — upgrade to export" : "Download favorites as CSV"}
                >
                  {isProPlan(plan) ? "Export favorites to CSV" : "Export favorites — Pro"}
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  onClick={() => {
                    setFavoritesLoaded(false);
                    void loadFavorites();
                  }}
                  disabled={favoritesLoading}
                >
                  {favoritesLoading ? "Refreshing…" : "Refresh"}
                </button>
              </div>
            </div>

            {favoritesLoading && favorites.length === 0 ? (
              <p className="text-sm text-zinc-500">Loading favorites…</p>
            ) : favorites.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                You haven&apos;t saved any favorites yet. Tap the ☆ on any generated caption to save it here.
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {favorites.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:p-4 dark:border-zinc-700 dark:bg-zinc-950/40"
                  >
                    <div className="mb-2 flex flex-col gap-1 text-xs text-zinc-500 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2 dark:text-zinc-400">
                      <span className="min-w-0 truncate">
                        <span className="font-medium text-zinc-700 dark:text-zinc-200">Topic:</span>{" "}
                        {item.topic || "—"}
                      </span>
                      <span className="truncate">
                        {item.platform} · {item.tone}
                      </span>
                    </div>
                    <ul className="flex flex-col gap-2">
                      {item.favoriteIndexes.map((idx) => {
                        const text = item.captions?.[idx];
                        if (!text) return null;
                        return (
                          <li
                            key={`${item.id}-${idx}`}
                            className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-800 sm:flex-row sm:items-start sm:justify-between dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                          >
                            <p className="min-w-0 flex-1 whitespace-pre-wrap break-words">{text}</p>
                            <div className="flex shrink-0 gap-2 sm:flex-col sm:gap-1.5">
                              <button
                                type="button"
                                className="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 sm:flex-none dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                onClick={async () => {
                                  await navigator.clipboard.writeText(text);
                                }}
                              >
                                Copy
                              </button>
                              <button
                                type="button"
                                className="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 sm:flex-none dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30"
                                onClick={() => unfavoriteSaved(item.id, idx)}
                              >
                                Remove
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {tab === "hookLibrary" ? (
          <HookLibraryTab
            onUseHook={(hookText) => {
              setTopic(hookText);
              setTab("captions");
            }}
          />
        ) : null}

        {tab === "collections" ? (
          <CollectionsTab
            plan={plan}
            checkoutLoading={checkoutLoading}
            onStartCheckout={startCheckout}
          />
        ) : null}

        {tab === "analytics" ? (
          <AnalyticsTab
            plan={plan}
            checkoutLoading={checkoutLoading}
            onStartCheckout={startCheckout}
          />
        ) : null}
      </div>

      <TokenUpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={(interval) => {
          setShowUpgradeModal(false);
          void startCheckout(interval);
        }}
        upgrading={checkoutLoading}
        resetAt={resetAt}
        message={upgradeMessage ?? undefined}
        plan={plan}
      />

      <WelcomeOnboardingModal open={showOnboarding} onClose={() => setShowOnboarding(false)} />
    </main>
  );
}
