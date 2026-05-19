"use client";

import { BufferScheduleButton } from "@/components/dashboard/BufferScheduleButton";

type CaptionActionsProps = {
  caption: string;
  copyLabel?: string;
  onCopy: () => void;
  disabled?: boolean;
  copyDisabledReason?: string;
};

export function CaptionActions({
  caption,
  copyLabel = "Copy",
  onCopy,
  disabled,
  copyDisabledReason,
}: CaptionActionsProps) {
  return (
    <div className="flex shrink-0 flex-col items-stretch gap-2 sm:min-w-[7.5rem] sm:items-end">
      <button
        type="button"
        title={copyDisabledReason ?? "Copy caption"}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        disabled={disabled}
        onClick={onCopy}
      >
        {copyLabel}
      </button>
      <BufferScheduleButton caption={caption} disabled={disabled} />
    </div>
  );
}
