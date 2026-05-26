"use client";

import { useCallback, useEffect, useState } from "react";

type Collection = {
  id: string;
  name: string;
  created_at: string;
  count: number;
};

type CollectionItem = {
  id: string;
  caption_text: string;
  platform: string | null;
  tone: string | null;
  topic: string | null;
  created_at: string;
};

type Props = {
  plan: "free" | "pro" | null;
  checkoutLoading: boolean;
  onStartCheckout: (interval?: "month" | "year") => void;
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function ProGate({
  checkoutLoading,
  onStartCheckout,
}: {
  checkoutLoading: boolean;
  onStartCheckout: (interval?: "month" | "year") => void;
}) {
  return (
    <div className="rounded-2xl border border-purple-300/60 bg-gradient-to-br from-purple-50 to-fuchsia-50 p-8 text-center dark:border-purple-500/40 dark:from-purple-950/40 dark:to-fuchsia-950/40">
      <span className="rounded-full border border-purple-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-widest text-purple-800 dark:border-purple-500/40 dark:bg-zinc-950 dark:text-purple-200">
        Pro feature
      </span>
      <h3 className="mt-4 text-xl font-bold text-zinc-900 sm:text-2xl dark:text-white">
        Organize your captions into collections
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-700 dark:text-zinc-300">
        Group your favorite captions by campaign, platform, or vibe — like
        &quot;Instagram Posts&quot;, &quot;TikTok Ideas&quot;, or
        &quot;Product Launches&quot;.
      </p>
      <button
        type="button"
        disabled={checkoutLoading}
        onClick={() => onStartCheckout("month")}
        className="mt-5 inline-flex min-h-[48px] items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-purple-500/30 transition hover:from-purple-400 hover:to-fuchsia-400 disabled:opacity-60"
      >
        {checkoutLoading ? "Opening Stripe…" : "Upgrade to Pro — $9/month"}
      </button>
    </div>
  );
}

export function CollectionsTab({
  plan,
  checkoutLoading,
  onStartCheckout,
}: Props) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeName, setActiveName] = useState<string>("");
  const [activeItems, setActiveItems] = useState<CollectionItem[]>([]);
  const [activeLoading, setActiveLoading] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const isPro = plan === "pro";

  const loadCollections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/collections");
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          proRequired?: boolean;
        };
        if (body.proRequired) {
          setCollections([]);
          return;
        }
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
    if (!isPro) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time fetch
    void loadCollections();
  }, [isPro, loadCollections]);

  const openCollection = useCallback(async (collection: Collection) => {
    setActiveId(collection.id);
    setActiveName(collection.name);
    setRenameValue(collection.name);
    setActiveLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/collections/${collection.id}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error || "Could not load collection.");
        setActiveItems([]);
        return;
      }
      const data = (await res.json()) as { items?: CollectionItem[]; name?: string };
      setActiveItems(data.items ?? []);
      if (data.name) setActiveName(data.name);
    } catch {
      setError("Could not load collection.");
      setActiveItems([]);
    } finally {
      setActiveLoading(false);
    }
  }, []);

  async function createCollection() {
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
      const data = (await res.json()) as Collection & { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not create collection.");
        return;
      }
      setCollections((prev) => [
        { id: data.id, name: data.name, created_at: data.created_at, count: 0 },
        ...prev,
      ]);
      setNewName("");
    } catch {
      setError("Could not create collection.");
    } finally {
      setCreating(false);
    }
  }

  async function renameCollection() {
    if (!activeId) return;
    const next = renameValue.trim();
    if (!next || next === activeName) return;
    setError(null);
    try {
      const res = await fetch(`/api/collections/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: next }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error || "Could not rename collection.");
        return;
      }
      setActiveName(next);
      setCollections((prev) =>
        prev.map((c) => (c.id === activeId ? { ...c, name: next } : c))
      );
    } catch {
      setError("Could not rename collection.");
    }
  }

  async function deleteCollection() {
    if (!activeId) return;
    if (!window.confirm(`Delete "${activeName}"? Captions saved here will be removed.`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/collections/${activeId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error || "Could not delete collection.");
        return;
      }
      setCollections((prev) => prev.filter((c) => c.id !== activeId));
      setActiveId(null);
      setActiveItems([]);
    } catch {
      setError("Could not delete collection.");
    }
  }

  async function removeItem(itemId: string) {
    if (!activeId) return;
    setActiveItems((prev) => prev.filter((i) => i.id !== itemId));
    try {
      const res = await fetch(`/api/collections/${activeId}/items/${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error || "Could not remove item.");
        // refresh on failure to undo optimistic delete
        void openCollection({
          id: activeId,
          name: activeName,
          created_at: "",
          count: 0,
        });
      } else {
        setCollections((prev) =>
          prev.map((c) =>
            c.id === activeId ? { ...c, count: Math.max(0, c.count - 1) } : c
          )
        );
      }
    } catch {
      setError("Could not remove item.");
    }
  }

  if (!isPro) {
    return <ProGate checkoutLoading={checkoutLoading} onStartCheckout={onStartCheckout} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {activeId ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/80">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-purple-600 transition hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-purple-950/40"
              onClick={() => {
                setActiveId(null);
                setActiveItems([]);
              }}
            >
              ← All collections
            </button>
            <button
              type="button"
              onClick={deleteCollection}
              className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50"
            >
              Delete collection
            </button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                maxLength={80}
                className="block min-h-[44px] flex-1 rounded-xl border border-zinc-300 bg-white px-3 text-base font-semibold text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              />
              {renameValue.trim() && renameValue.trim() !== activeName ? (
                <button
                  type="button"
                  onClick={renameCollection}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-500"
                >
                  Save
                </button>
              ) : null}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {activeItems.length} caption{activeItems.length === 1 ? "" : "s"}
            </p>
          </div>

          {activeLoading ? (
            <p className="mt-6 text-sm text-zinc-500">Loading captions…</p>
          ) : activeItems.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
              <p>No captions saved here yet.</p>
              <p className="mt-1 text-xs">
                Star a caption on the Captions tab and pick this collection to
                add it here.
              </p>
            </div>
          ) : (
            <ul className="mt-5 flex flex-col gap-3">
              {activeItems.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:p-4 dark:border-zinc-700 dark:bg-zinc-950/40"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>
                      {item.platform ?? "—"} · {item.tone ?? "—"}
                    </span>
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm text-zinc-800 dark:text-zinc-100">
                    {item.caption_text}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(item.caption_text);
                      }}
                      className="inline-flex min-h-[36px] items-center justify-center rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="inline-flex min-h-[36px] items-center justify-center rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/80">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Caption Collections
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Group your favorite captions into collections like &quot;Instagram
              Posts&quot;, &quot;TikTok Ideas&quot;, or &quot;Product
              Launches&quot;.
            </p>

            <form
              className="mt-4 flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                void createCollection();
              }}
            >
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New collection name…"
                maxLength={80}
                className="block min-h-[44px] w-full flex-1 rounded-xl border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              />
              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:opacity-50"
              >
                {creating ? "Creating…" : "+ New collection"}
              </button>
            </form>
          </div>

          {loading ? (
            <p className="text-sm text-zinc-500">Loading collections…</p>
          ) : collections.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-8 text-center dark:border-zinc-700">
              <p className="text-3xl">📁</p>
              <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                No collections yet
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Create one above to start organizing your saved captions.
              </p>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {collections.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => openCollection(c)}
                    className="block w-full rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:border-purple-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/80 dark:hover:border-purple-500/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-zinc-900 dark:text-white">
                          {c.name}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {c.count} caption{c.count === 1 ? "" : "s"} ·{" "}
                          {formatDate(c.created_at)}
                        </p>
                      </div>
                      <span className="text-2xl" aria-hidden>
                        📁
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
