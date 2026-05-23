"use client";

import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type HistoryItem = {
  id: string;
  topic: string;
  platform: string;
  tone: string;
  language?: string;
  captions: string[];
  created_at: string;
  favoriteIndexes?: number[];
};

const PLATFORM_FILTERS: { id: string; label: string; match: (p: string) => boolean }[] = [
  { id: "all", label: "All", match: () => true },
  {
    id: "instagram",
    label: "Instagram",
    match: (p) => p.toLowerCase().includes("insta"),
  },
  { id: "tiktok", label: "TikTok", match: (p) => p.toLowerCase().includes("tiktok") },
  {
    id: "linkedin",
    label: "LinkedIn",
    match: (p) => p.toLowerCase().includes("linkedin"),
  },
  {
    id: "twitter",
    label: "Twitter / X",
    match: (p) => {
      const l = p.toLowerCase();
      return l.includes("twitter") || l === "x" || l.endsWith("/x") || l.includes("x.com");
    },
  },
  {
    id: "facebook",
    label: "Facebook",
    match: (p) => p.toLowerCase().includes("facebook") || p.toLowerCase() === "fb",
  },
  {
    id: "youtube",
    label: "YouTube",
    match: (p) => p.toLowerCase().includes("youtube") || p.toLowerCase() === "yt",
  },
  {
    id: "threads",
    label: "Threads",
    match: (p) => p.toLowerCase().includes("thread"),
  },
  {
    id: "pinterest",
    label: "Pinterest",
    match: (p) => p.toLowerCase().includes("pinterest"),
  },
];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function HistoryPageClient() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/sign-in?redirect_url=/history");
    }
  }, [isLoaded, isSignedIn, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/captions/history");
      const data = (await res.json()) as { items?: HistoryItem[]; error?: string };
      if (!res.ok) {
        setError(data.error || "Could not load caption history.");
        setItems([]);
        return;
      }
      setItems(data.items ?? []);
    } catch {
      setError("Could not load caption history.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch history when signed in
    void load();
  }, [isSignedIn, load]);

  const filtered = useMemo(() => {
    const matcher = PLATFORM_FILTERS.find((f) => f.id === platformFilter) ?? PLATFORM_FILTERS[0]!;
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (!matcher.match(item.platform)) return false;
      if (!q) return true;
      return (
        item.topic.toLowerCase().includes(q) ||
        item.platform.toLowerCase().includes(q) ||
        item.tone.toLowerCase().includes(q)
      );
    });
  }, [items, platformFilter, search]);

  async function copyCaption(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1500);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this saved generation? This cannot be undone.")) return;
    setDeletingId(id);
    setError("");
    const previous = items;
    setItems((prev) => prev.filter((row) => row.id !== id));
    try {
      const res = await fetch(`/api/captions/history?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Could not delete this entry.");
        setItems(previous);
      }
    } catch {
      setError("Could not delete this entry.");
      setItems(previous);
    } finally {
      setDeletingId(null);
    }
  }

  if (!isLoaded || !isSignedIn) {
    return (
      <main className="min-h-screen bg-zinc-50 px-4 py-12 dark:bg-gradient-to-b dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
        <div className="mx-auto max-w-3xl animate-pulse rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="h-8 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-900 sm:py-10 dark:bg-gradient-to-b dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 dark:text-white">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 sm:gap-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm backdrop-blur sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/dashboard"
              className="shrink-0 rounded-lg outline-none ring-offset-2 ring-offset-white focus-visible:ring-2 focus-visible:ring-purple-500 dark:ring-offset-zinc-900"
              aria-label="CaptionAI dashboard"
            >
              <BrandLogo className="h-9 w-9" />
            </Link>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-600 sm:text-xs dark:text-purple-300">
                CaptionAI
              </p>
              <h1 className="truncate text-xl font-semibold sm:text-2xl">Caption history</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Dashboard
            </Link>
            <Link
              href="/profile"
              className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Profile
            </Link>
            <UserButton userProfileUrl="/settings" userProfileMode="navigation" />
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 dark:border-zinc-800 dark:bg-zinc-900/80">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div>
              <label
                htmlFor="history-search"
                className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500"
              >
                Search by topic
              </label>
              <input
                id="history-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by topic, platform, or tone…"
                className="block min-h-[44px] w-full rounded-xl border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Filter by platform
              </p>
              <div
                className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 hide-scrollbar"
                role="tablist"
              >
                {PLATFORM_FILTERS.map((filter) => {
                  const active = platformFilter === filter.id;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setPlatformFilter(filter.id)}
                      aria-pressed={active}
                      className={`inline-flex min-h-[36px] shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                        active
                          ? "bg-purple-600 text-white shadow-sm"
                          : "border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>
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

        {loading && items.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/80">
            Loading your history…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-600 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-300">
            {items.length === 0
              ? "You haven't generated any captions yet. Head to the dashboard to make your first one."
              : "No saved generations match your filters."}
            {items.length === 0 ? (
              <div className="mt-4">
                <Link
                  href="/dashboard"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-500"
                >
                  Generate captions
                </Link>
              </div>
            ) : null}
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {filtered.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 dark:border-zinc-800 dark:bg-zinc-900/80"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-purple-600 dark:text-purple-300">
                      {item.platform} · {item.tone}
                    </p>
                    <h2 className="mt-1 break-words text-base font-semibold text-zinc-900 sm:text-lg dark:text-white">
                      {item.topic || "—"}
                    </h2>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {formatDate(item.created_at)}
                      {item.language ? ` · ${item.language}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteItem(item.id)}
                    disabled={deletingId === item.id}
                    className="inline-flex min-h-[36px] shrink-0 items-center justify-center self-start rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50"
                  >
                    {deletingId === item.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
                <ul className="mt-4 flex flex-col gap-3">
                  {item.captions.map((caption, idx) => {
                    const key = `${item.id}-${idx}`;
                    return (
                      <li
                        key={key}
                        className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 sm:p-4 dark:border-zinc-700 dark:bg-zinc-950/60"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-800 sm:text-base dark:text-zinc-100">
                            {caption}
                          </p>
                          <button
                            type="button"
                            onClick={() => copyCaption(caption, key)}
                            className="inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                          >
                            {copiedKey === key ? "Copied!" : "Copy"}
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
    </main>
  );
}
