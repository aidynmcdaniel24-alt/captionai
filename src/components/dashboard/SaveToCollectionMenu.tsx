"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { friendlyError } from "@/lib/friendly-error";

type Collection = { id: string; name: string; containsCaption?: boolean };

type Props = {
  captionText: string;
  platform?: string;
  tone?: string;
  topic?: string;
};

/**
 * Dropdown that lets Pro users add a generated caption to one of their
 * existing collections. Lazily loads the collection list (and which ones
 * already contain this caption) the first time the dropdown is opened so we
 * don't hit Supabase on every render.
 */
export function SaveToCollectionMenu({ captionText, platform, tone, topic }: Props) {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNewInput, setShowNewInput] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadCollections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = captionText
        ? `?caption=${encodeURIComponent(captionText.slice(0, 4000))}`
        : "";
      const res = await fetch(`/api/collections${query}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(friendlyError({ message: body.error, status: res.status }, "Could not load collections."));
        return;
      }
      const data = (await res.json()) as { items?: Collection[] };
      const items = data.items ?? [];
      setCollections(items);
      setSavedIds(
        new Set(items.filter((c) => c.containsCaption).map((c) => c.id))
      );
    } catch {
      setError("Could not load collections.");
    } finally {
      setLoading(false);
    }
  }, [captionText]);

  useEffect(() => {
    if (!open) return;
    if (collections === null) {
      void loadCollections();
    }
    function handleClickAway(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickAway);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickAway);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, collections, loadCollections]);

  // Clear any pending close timer on unmount.
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const scheduleClose = useCallback((name: string) => {
    setConfirmation(name);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      setConfirmation(null);
    }, 1400);
  }, []);

  async function saveTo(collectionId: string, collectionName: string) {
    setSavingId(collectionId);
    setError(null);
    try {
      const res = await fetch(`/api/collections/${collectionId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          captionText,
          platform: platform ?? null,
          tone: tone ?? null,
          topic: topic ?? null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(friendlyError({ message: body.error, status: res.status }, "Could not save."));
        return;
      }
      setSavedIds((prev) => new Set(prev).add(collectionId));
      scheduleClose(collectionName);
    } catch {
      setError("Could not save.");
    } finally {
      setSavingId(null);
    }
  }

  async function createAndSave() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(friendlyError({ message: body.error, status: res.status }, "Could not create collection."));
        return;
      }
      const data = (await res.json()) as { id: string; name: string };
      setCollections((prev) => [{ id: data.id, name: data.name }, ...(prev ?? [])]);
      setNewName("");
      setShowNewInput(false);
      await saveTo(data.id, data.name);
    } catch {
      setError("Could not create collection.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="inline-flex min-h-[36px] items-center justify-center gap-1 rounded-lg border border-purple-300 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-800 transition hover:bg-purple-100 dark:border-purple-500/40 dark:bg-purple-950/30 dark:text-purple-200 dark:hover:bg-purple-950/60"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span aria-hidden>📁</span>
        <span>Save to…</span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute right-0 z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] origin-top-right overflow-hidden rounded-2xl border border-purple-100 bg-white shadow-2xl ring-1 ring-black/5 dark:border-purple-500/20 dark:bg-zinc-900 dark:ring-white/10"
          >
            <div className="border-b border-zinc-100 bg-gradient-to-r from-purple-50 to-fuchsia-50 px-3 py-2.5 dark:border-zinc-800 dark:from-purple-950/40 dark:to-fuchsia-950/30">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-purple-700 dark:text-purple-300">
                Save to collection
              </p>
            </div>

            <AnimatePresence>
              {confirmation ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 border-b border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                  <span aria-hidden>✓</span>
                  <span className="truncate">Saved to {confirmation}!</span>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div className="p-2">
              {loading ? (
                <div className="space-y-2 px-1 py-2">
                  <div className="h-8 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
                  <div className="h-8 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
                </div>
              ) : collections && collections.length > 0 ? (
                <ul className="max-h-52 space-y-0.5 overflow-y-auto">
                  {collections.map((c) => {
                    const alreadyIn = savedIds.has(c.id);
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => void saveTo(c.id, c.name)}
                          disabled={savingId !== null}
                          className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-700 transition hover:bg-purple-50 disabled:opacity-50 dark:text-zinc-200 dark:hover:bg-purple-950/40"
                          role="menuitem"
                        >
                          <span className="truncate">{c.name}</span>
                          {savingId === c.id ? (
                            <span className="text-xs text-zinc-400">Saving…</span>
                          ) : alreadyIn ? (
                            <span
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                              title="Already in this collection"
                              aria-label="Already saved"
                            >
                              ✓
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="px-2.5 py-4 text-center text-xs text-zinc-500">
                  No collections yet. Create one below.
                </p>
              )}
            </div>

            <div className="border-t border-zinc-100 p-2 dark:border-zinc-800">
              {showNewInput ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void createAndSave();
                  }}
                  className="flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Collection name…"
                    maxLength={60}
                    autoFocus
                    className="block min-h-[40px] flex-1 rounded-lg border border-zinc-300 bg-white px-2.5 text-sm text-zinc-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={creating || !newName.trim()}
                    className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-600 px-3 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  >
                    {creating ? "…" : "Save"}
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNewInput(true)}
                  className="flex w-full min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-dashed border-purple-300 px-2.5 text-sm font-medium text-purple-700 transition hover:bg-purple-50 dark:border-purple-500/40 dark:text-purple-300 dark:hover:bg-purple-950/40"
                >
                  <span aria-hidden className="text-base leading-none">
                    +
                  </span>
                  New collection
                </button>
              )}
            </div>

            {error ? (
              <p
                className="px-3 pb-2 text-xs text-red-600 dark:text-red-400"
                role="alert"
              >
                {error}
              </p>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
