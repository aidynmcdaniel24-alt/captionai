"use client";

import {
  BRAND_PERSONALITIES,
  type BrandPersonality,
  type BrandVoice,
} from "@/lib/brand-voice";
import { useCallback, useEffect, useState } from "react";

const EMPTY_VOICE: BrandVoice = {
  brandName: "",
  description: "",
  personality: [],
  wordsToUse: "",
  wordsToAvoid: "",
  exampleCaption: "",
};

type Status = "idle" | "loading" | "saving" | "saved" | "deleting" | "error";

type BrandVoiceTabProps = {
  onChange?: (active: boolean) => void;
};

type BrandVoiceResponse = {
  brandVoice?: BrandVoice | null;
  error?: string;
};

function normalizeVoice(voice: BrandVoice | null | undefined): BrandVoice {
  if (!voice) return EMPTY_VOICE;
  return {
    brandName: voice.brandName ?? "",
    description: voice.description ?? "",
    personality: Array.isArray(voice.personality) ? voice.personality : [],
    wordsToUse: voice.wordsToUse ?? "",
    wordsToAvoid: voice.wordsToAvoid ?? "",
    exampleCaption: voice.exampleCaption ?? "",
  };
}

function hasActiveBrandVoice(voice: BrandVoice): boolean {
  return Boolean(
    voice.brandName.trim() ||
      voice.description.trim() ||
      voice.personality.length > 0 ||
      voice.wordsToUse.trim() ||
      voice.wordsToAvoid.trim() ||
      voice.exampleCaption.trim()
  );
}

export function BrandVoiceTab({ onChange }: BrandVoiceTabProps) {
  const [voice, setVoice] = useState<BrandVoice>(EMPTY_VOICE);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [hasSaved, setHasSaved] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/brand-voice");
      const data = (await res.json()) as BrandVoiceResponse;
      if (!res.ok) {
        setError(data.error || "Could not load brand voice.");
        setStatus("error");
        return;
      }

      // A null brandVoice is the normal "nothing saved yet" state.
      // Hydrate the empty form and make sure no stale error is shown.
      const loaded = normalizeVoice(data.brandVoice ?? null);
      const active = hasActiveBrandVoice(loaded);
      setError("");
      setVoice(loaded);
      setHasSaved(active);
      onChange?.(active);
      setStatus("idle");
    } catch {
      setError("Could not load brand voice.");
      setStatus("error");
    }
  }, [onChange]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate brand voice on mount
    void load();
  }, [load]);

  function togglePersonality(p: BrandPersonality) {
    setVoice((prev) => {
      const has = prev.personality.includes(p);
      return {
        ...prev,
        personality: has
          ? prev.personality.filter((x) => x !== p)
          : [...prev.personality, p],
      };
    });
  }

  async function save() {
    setStatus("saving");
    setError("");
    try {
      const res = await fetch("/api/brand-voice", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(voice),
      });
      const data = (await res.json()) as BrandVoiceResponse;
      if (!res.ok) {
        setError(data.error || "Could not save brand voice.");
        setStatus("error");
        return;
      }
      const next = normalizeVoice(data.brandVoice ?? voice);
      const active = hasActiveBrandVoice(next);
      setError("");
      setVoice(next);
      setHasSaved(active);
      onChange?.(active);
      setStatus("saved");
      setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 2000);
    } catch {
      setError("Could not save brand voice.");
      setStatus("error");
    }
  }

  async function clearAll() {
    if (!confirm("Clear your brand voice? Your captions will go back to generic platform tones.")) {
      return;
    }
    setStatus("deleting");
    setError("");
    try {
      const res = await fetch("/api/brand-voice", { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Could not clear brand voice.");
        setStatus("error");
        return;
      }
      setVoice(EMPTY_VOICE);
      setHasSaved(false);
      onChange?.(false);
      setStatus("idle");
    } catch {
      setError("Could not clear brand voice.");
      setStatus("error");
    }
  }

  const saving = status === "saving";
  const deleting = status === "deleting";

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/80">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
            Brand voice
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Teach the AI how your brand sounds. We&apos;ll match this style on every caption.
          </p>
        </div>
        {hasSaved ? (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-200">
            <span aria-hidden>●</span>
            Brand Voice active
          </span>
        ) : null}
      </div>

      {status === "error" && error ? (
        <p
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {status === "loading" ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="space-y-5">
          <div>
            <label
              htmlFor="bv-name"
              className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-200"
            >
              Brand name
            </label>
            <input
              id="bv-name"
              type="text"
              maxLength={80}
              value={voice.brandName}
              onChange={(e) => setVoice((p) => ({ ...p, brandName: e.target.value }))}
              placeholder="e.g. Northside Coffee"
              className="block min-h-[48px] w-full rounded-xl border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="bv-description"
              className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-200"
            >
              What your brand does (1-2 sentences)
            </label>
            <textarea
              id="bv-description"
              maxLength={400}
              value={voice.description}
              onChange={(e) => setVoice((p) => ({ ...p, description: e.target.value }))}
              placeholder="e.g. We're an independent coffee shop in New Orleans that serves single-origin pour-overs and hosts weekend vinyl nights."
              className="min-h-24 w-full rounded-xl border border-zinc-300 bg-white p-3 text-base text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
            />
            <p className="mt-1 text-xs text-zinc-500">{voice.description.length}/400</p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Brand personality
            </p>
            <div className="flex flex-wrap gap-2">
              {BRAND_PERSONALITIES.map((p) => {
                const active = voice.personality.includes(p);
                return (
                  <label
                    key={p}
                    className={`inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      active
                        ? "border-purple-500 bg-purple-600 text-white shadow-sm"
                        : "border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-purple-300 hover:bg-purple-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-purple-500/60 dark:hover:bg-purple-950/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => togglePersonality(p)}
                      className="sr-only"
                    />
                    {p}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="bv-use"
                className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-200"
              >
                Words/phrases you always use
              </label>
              <textarea
                id="bv-use"
                maxLength={400}
                value={voice.wordsToUse}
                onChange={(e) => setVoice((p) => ({ ...p, wordsToUse: e.target.value }))}
                placeholder="e.g. neighbors, slow mornings, our regulars"
                className="min-h-20 w-full rounded-xl border border-zinc-300 bg-white p-3 text-base text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              />
            </div>
            <div>
              <label
                htmlFor="bv-avoid"
                className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-200"
              >
                Words/phrases you never use
              </label>
              <textarea
                id="bv-avoid"
                maxLength={400}
                value={voice.wordsToAvoid}
                onChange={(e) => setVoice((p) => ({ ...p, wordsToAvoid: e.target.value }))}
                placeholder="e.g. game-changer, synergy, hustle"
                className="min-h-20 w-full rounded-xl border border-zinc-300 bg-white p-3 text-base text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="bv-example"
              className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-200"
            >
              Example caption you love
            </label>
            <textarea
              id="bv-example"
              maxLength={1200}
              value={voice.exampleCaption}
              onChange={(e) => setVoice((p) => ({ ...p, exampleCaption: e.target.value }))}
              placeholder="Paste a caption that perfectly captures how your brand sounds. The AI will match this tone, rhythm, and vocabulary."
              className="min-h-32 w-full rounded-xl border border-zinc-300 bg-white p-3 text-base text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
            />
            <p className="mt-1 text-xs text-zinc-500">{voice.exampleCaption.length}/1200</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-purple-600 px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-purple-500 disabled:opacity-60 sm:w-auto"
            >
              {saving ? "Saving…" : status === "saved" ? "Saved" : "Save brand voice"}
            </button>
            {hasSaved ? (
              <button
                type="button"
                onClick={clearAll}
                disabled={deleting}
                className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50 sm:w-auto dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50"
              >
                {deleting ? "Clearing…" : "Clear brand voice"}
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
