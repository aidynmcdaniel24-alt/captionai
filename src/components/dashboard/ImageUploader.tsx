"use client";

import { useRef } from "react";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

type Props = {
  preview: string | null;
  analyzing: boolean;
  cost: number;
  isPro: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
};

/**
 * Compact image-to-caption uploader. Shows a "Describe a photo" button
 * inline with the topic field. On mobile, the underlying file input
 * picks up `capture="environment"` so users can shoot a photo directly
 * from the camera. After upload, a preview thumbnail and an "Analyzing"
 * state replace the empty button.
 */
export function ImageUploader({
  preview,
  analyzing,
  cost,
  isPro,
  onUpload,
  onRemove,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      window.alert("Image is too large. Please pick something under 5 MB.");
      event.target.value = "";
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      window.alert("Unsupported image. Use JPG, PNG or WEBP.");
      event.target.value = "";
      return;
    }
    onUpload(file);
    event.target.value = "";
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleChange}
        className="hidden"
      />

      {preview ? (
        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white p-1.5 pr-2 dark:border-zinc-700 dark:bg-zinc-950/60">
          <span className="relative block h-10 w-10 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900">
            {/* eslint-disable-next-line @next/next/no-img-element -- data: URL preview, no remote optimization */}
            <img
              src={preview}
              alt="Uploaded preview"
              className="h-full w-full object-cover"
            />
          </span>
          {analyzing ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-purple-500/40 border-t-purple-600" />
              Analyzing your image…
            </span>
          ) : (
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Image added
            </span>
          )}
          <button
            type="button"
            onClick={onRemove}
            className="ml-1 rounded-md p-1 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Remove image"
            disabled={analyzing}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={analyzing}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-purple-300 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-800 transition hover:bg-purple-100 disabled:opacity-60 dark:border-purple-500/40 dark:bg-purple-950/30 dark:text-purple-200 dark:hover:bg-purple-950/60"
        >
          <span aria-hidden>📸</span>
          <span>
            {isPro ? "Describe a photo" : `Describe a photo (${cost} tokens)`}
          </span>
        </button>
      )}
    </div>
  );
}
