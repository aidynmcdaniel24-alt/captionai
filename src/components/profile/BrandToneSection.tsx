"use client";

import { isAnnualPlan } from "@/lib/plan";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const PERSONALITIES = [
  "Bold",
  "Playful",
  "Professional",
  "Luxury",
  "Edgy",
  "Minimal",
  "Friendly",
  "Authoritative",
] as const;

type Props = {
  plan: "free" | "pro" | "annual" | null;
};

export function BrandToneSection({ plan }: Props) {
  const [brandName, setBrandName] = useState("");
  const [personality, setPersonality] = useState<string[]>([]);
  const [wordsToUse, setWordsToUse] = useState("");
  const [wordsToAvoid, setWordsToAvoid] = useState("");
  const [exampleCaption, setExampleCaption] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/brand-voice");
      if (!res.ok) return;
      const data = (await res.json()) as {
        profile?: {
          brandName?: string;
          personality?: string[];
          wordsToUse?: string[];
          wordsToAvoid?: string[];
          exampleCaption?: string;
        } | null;
        tableMissing?: boolean;
      };
      if (data.tableMissing) {
        setError("Run the brand_voice SQL in Supabase to enable this feature.");
        return;
      }
      const p = data.profile;
      if (p) {
        setBrandName(p.brandName ?? "");
        setPersonality(p.personality ?? []);
        setWordsToUse((p.wordsToUse ?? []).join(", "));
        setWordsToAvoid((p.wordsToAvoid ?? []).join(", "));
        setExampleCaption(p.exampleCaption ?? "");
      }
    } catch {
      setError("Could not load brand tone.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAnnualPlan(plan)) void load();
    else setLoading(false);
  }, [plan, load]);

  function togglePersonality(p: string) {
    setPersonality((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/brand-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName,
          personality,
          wordsToUse: wordsToUse.split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
          wordsToAvoid: wordsToAvoid.split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
          exampleCaption,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; tableMissing?: boolean };
      if (!res.ok) {
        setError(data.error ?? "Could not save.");
        return;
      }
      setMessage("Brand tone saved — it will apply automatically when you generate captions.");
    } catch {
      setError("Could not save brand tone.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950/50">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Brand tone</h2>
      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
        Annual only — save your brand voice once; captions match it automatically.
      </p>

      {!isAnnualPlan(plan) ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-100">
          <p>Upgrade to Annual to unlock Brand Tone Profiles.</p>
          <Link
            href="/upgrade"
            className="mt-2 inline-block text-xs font-semibold underline"
          >
            View Annual plan
          </Link>
        </div>
      ) : loading ? (
        <p className="mt-4 text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-zinc-500">Brand name</label>
            <input
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
            />
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Brand personality</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PERSONALITIES.map((p) => (
                <label
                  key={p}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                    personality.includes(p)
                      ? "border-amber-500 bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
                      : "border-zinc-300 dark:border-zinc-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={personality.includes(p)}
                    onChange={() => togglePersonality(p)}
                  />
                  {p}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-zinc-500">Words you always use</label>
            <input
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
              placeholder="comma-separated"
              value={wordsToUse}
              onChange={(e) => setWordsToUse(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-zinc-500">Words you never use</label>
            <input
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
              placeholder="comma-separated"
              value={wordsToAvoid}
              onChange={(e) => setWordsToAvoid(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-zinc-500">Example caption you love</label>
            <textarea
              className="mt-1 min-h-20 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
              value={exampleCaption}
              onChange={(e) => setExampleCaption(e.target.value)}
            />
          </div>

          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-300" role="status">
              {message}
            </p>
          ) : null}

          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save brand tone"}
          </button>
        </div>
      )}
    </section>
  );
}
