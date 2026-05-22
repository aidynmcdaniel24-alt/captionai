"use client";

import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  hasImage: boolean;
};

const MAX_BYTES = 10 * 1024 * 1024;
const SUCCESS_AUTO_HIDE_MS = 2500;

function detectIsMobile(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent || "";
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) {
    return true;
  }
  // iPadOS 13+ reports as Macintosh but supports touch.
  if (
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1 &&
    /Macintosh/.test(ua)
  ) {
    return true;
  }
  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches &&
    window.matchMedia("(hover: none)").matches
  ) {
    return true;
  }
  return false;
}

export function ChangePhotoButton({ hasImage }: Props) {
  const { user } = useUser();
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsMobile(detectIsMobile());
  }, []);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const handleUpload = useCallback(
    async (file: File | undefined | null) => {
      if (!file || !user) {
        return;
      }
      if (!file.type.startsWith("image/")) {
        setError("That file isn't an image. Please choose a photo.");
        return;
      }
      if (file.size > MAX_BYTES) {
        setError("Image is too large. Please pick one under 10 MB.");
        return;
      }
      setError(null);
      setSuccess(false);
      setIsUploading(true);
      try {
        await user.setProfileImage({ file });
        // Force a refresh so user.imageUrl reflects the new asset URL.
        await user.reload();
        setSuccess(true);
        if (successTimerRef.current) {
          clearTimeout(successTimerRef.current);
        }
        successTimerRef.current = setTimeout(() => {
          setSuccess(false);
        }, SUCCESS_AUTO_HIDE_MS);
      } catch (err) {
        const message =
          err instanceof Error && err.message
            ? err.message
            : "We couldn't upload that photo. Please try again.";
        setError(message);
      } finally {
        setIsUploading(false);
      }
    },
    [user],
  );

  const onFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      // Reset the input so picking the same file twice still fires change.
      event.target.value = "";
      void handleUpload(file);
    },
    [handleUpload],
  );

  const openPicker = useCallback(() => {
    setError(null);
    setSuccess(false);
    if (isMobile) {
      setShowOptions(true);
    } else {
      libraryInputRef.current?.click();
    }
  }, [isMobile]);

  const buttonLabel = isUploading
    ? "Uploading…"
    : hasImage
      ? "Change photo"
      : "Upload photo";

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        disabled={isUploading || !user}
        aria-busy={isUploading}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-purple-500/40 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-900 transition hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-purple-950/30 dark:text-purple-200 dark:hover:bg-purple-950/50"
      >
        {isUploading ? (
          <svg
            aria-hidden="true"
            className="h-4 w-4 animate-spin text-purple-700 dark:text-purple-300"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              className="opacity-25"
            />
            <path
              d="M4 12a8 8 0 0 1 8-8"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        ) : null}
        {buttonLabel}
      </button>

      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFileChange}
      />

      <div aria-live="polite" className="min-h-0">
        {success ? (
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            Photo updated!
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
      </div>

      {showOptions ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Update profile photo"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onClick={() => setShowOptions(false)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-t-2xl border border-zinc-200 bg-white p-4 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 sm:rounded-2xl"
          >
            <h3 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Update profile photo
            </h3>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-left text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => {
                  setShowOptions(false);
                  // Defer the click so the dialog has time to close on iOS.
                  setTimeout(() => cameraInputRef.current?.click(), 0);
                }}
              >
                Take photo
              </button>
              <button
                type="button"
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-left text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => {
                  setShowOptions(false);
                  setTimeout(() => libraryInputRef.current?.click(), 0);
                }}
              >
                Choose from library
              </button>
              <button
                type="button"
                className="mt-1 w-full rounded-xl px-4 py-3 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                onClick={() => setShowOptions(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
