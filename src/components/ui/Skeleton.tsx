import type { CSSProperties } from "react";

/**
 * Animated pulse skeleton primitive. Compose these to mimic the layout that is
 * about to load so users see structure instead of a blank screen.
 */
export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden
      style={style}
      className={`animate-pulse rounded-md bg-zinc-200/80 dark:bg-zinc-800/80 ${className}`}
    />
  );
}

/** A card-shaped skeleton block with a few text lines. */
export function SkeletonCard({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60 ${className}`}
    >
      <Skeleton className="h-5 w-1/3" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-3.5"
            style={{ width: `${90 - i * 12}%` }}
          />
        ))}
      </div>
    </div>
  );
}
