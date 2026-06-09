"use client";

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

type BrandProfile = {
  brandName?: string;
  personality?: string[];
  wordsToUse?: string[];
  wordsToAvoid?: string[];
  exampleCaption?: string;
};

export function isBrandToneProfileSaved(profile: BrandProfile | null | undefined): boolean {
  if (!profile) return false;
  return Boolean(
    profile.brandName?.trim() ||
      (profile.personality?.length ?? 0) > 0 ||
      (profile.wordsToUse?.length ?? 0) > 0 ||
      (profile.wordsToAvoid?.length ?? 0) > 0 ||
      profile.exampleCaption?.trim()
  );
}

type Props = {
  onProfileChange?: (saved: boolean) => void;
};

export function BrandToneSection({ onProfileChange }: Props) {
  const [brandName, setBrandName] = useState("");
  const [personality, setPersonality] = useState<string[]>([]);
  const [wordsToUse, setWordsToUse] = useState("");
  const [wordsToAvoid, setWordsToAvoid] = useState("");
  const [exampleCaption, setExampleCaption] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const applyProfile = useCallback(
    (profile: BrandProfile | null | undefined) => {
      setBrandName(profile?.brandName ?? "");
      setPersonality(profile?.personality ?? []);
      setWordsToUse((profile?.wordsToUse ?? []).join(", "));
      setWordsToAvoid((profile?.wordsToAvoid ?? []).join(", "));
      setExampleCaption(profile?.exampleCaption ?? "");
      onProfileChange?.(isBrandToneProfileSaved(profile));
    },
    [onProfileChange]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/brand-voice");
      const data = (await res.json()) as {
        profile?: BrandProfile | null;
        tableMissing?: boolean;
        error?: string;
      };
      if (data.tableMissing) {
        setError(
          "Brand voice table is not set up yet. Run the brand_voice SQL migration in Supabase first."
        );
        onProfileChange?.(false);
        return;
      }
      if (!res.ok) {
        applyProfile(null);
        return;
      }
      applyProfile(data.profile);
    } catch {
      applyProfile(null);
    } finally {
      setLoading(false);
    }
  }, [applyProfile, onProfileChange]);

  useEffect(() => {
    void load();
  }, [load]);

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
          wordsToUse,
          wordsToAvoid,
          exampleCaption,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; tableMissing?: boolean };
      if (!res.ok) {
        setError(data.error ?? "Could not save.");
        return;
      }
      setMessage("Brand tone saved — it will apply automatically when you generate captions.");
      onProfileChange?.(
        isBrandToneProfileSaved({
          brandName,
          personality,
          wordsToUse: wordsToUse.split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
          wordsToAvoid: wordsToAvoid.split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
          exampleCaption,
        })
      );
    } catch {
      setError("Could not save brand tone.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/80">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Brand tone</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Save your brand voice once — captions match it automatically on every generation.
      </p>

      {loading ? (
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
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50 sm:w-auto"
          >
            {saving ? "Saving…" : "Save brand tone"}
          </button>
        </div>
      )}
    </div>
  );
}
