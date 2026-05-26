"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Collection = { id: string; name: string };

type Props = {
  captionText: string;
  platform?: string;
  tone?: string;
  topic?: string;
};

/**
 * Dropdown that lets Pro users add a generated caption to one of their
 * existing collections. Lazily loads the collection list the first time
 * the dropdown is opened so we don't hit Supabase on every render.
 */
export function SaveToCollectionMenu({ captionText, platform, tone, topic }: Props) {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const loadCollections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/collections");
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error || "Could not load collections.");
        return;
      }
      const data = (await res.json()) as { items?: Collection[] };
      setCollections(data.items ?? []);
    } catch {
      setError("Could not load collections.");
    } finally {
      setLoading(false);
    }
  }, []);

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
    document.addEventListener("mousedown", handleClickAway);
    return () => document.removeEventListener("mousedown", handleClickAway);
  }, [open, collections, loadCollections]);

  async function saveTo(collectionId: string) {
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
        setError(body.error || "Could not save.");
        return;
      }
      setSavedId(collectionId);
      setTimeout(() => {
        setSavedId(null);
        setOpen(false);
      }, 1200);
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
        setError(body.error || "Could not create collection.");
        return;
      }
      const data = (await res.json()) as { id: string; name: string };
      setCollections((prev) => [{ id: data.id, name: data.name }, ...(prev ?? [])]);
      setNewName("");
      await saveTo(data.id);
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
        className="inline-flex min-h-[36px] items-center justify-center gap-1 rounded-md border border-purple-300 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-800 transition hover:bg-purple-100 dark:border-purple-500/40 dark:bg-purple-950/30 dark:text-purple-200 dark:hover:bg-purple-950/60"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span aria-hidden>📁</span>
        <span>Save to…</span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          <p className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
            Save to collection
          </p>
          {loading ? (
            <p className="px-2 py-3 text-xs text-zinc-500">Loading…</p>
          ) : collections && collections.length > 0 ? (
            <ul className="max-h-48 overflow-y-auto">
              {collections.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => void saveTo(c.id)}
                    disabled={savingId !== null}
                    className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm text-zinc-700 transition hover:bg-purple-50 disabled:opacity-50 dark:text-zinc-200 dark:hover:bg-purple-950/40"
                    role="menuitem"
                  >
                    <span className="truncate">{c.name}</span>
                    {savedId === c.id ? (
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        Saved
                      </span>
                    ) : savingId === c.id ? (
                      <span className="text-xs text-zinc-400">…</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-2 py-3 text-xs text-zinc-500">No collections yet.</p>
          )}

          <div className="mt-2 border-t border-zinc-200 pt-2 dark:border-zinc-700">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void createAndSave();
              }}
              className="flex items-center gap-1"
            >
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New collection…"
                maxLength={60}
                className="block min-h-[36px] flex-1 rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              />
              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className="inline-flex min-h-[36px] items-center justify-center rounded-md bg-purple-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-purple-500 disabled:opacity-50"
              >
                {creating ? "…" : "Add"}
              </button>
            </form>
          </div>

          {error ? (
            <p className="mt-1 px-2 text-xs text-red-600 dark:text-red-400">{error}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
