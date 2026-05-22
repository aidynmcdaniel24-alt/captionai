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
    <div className="flex w-full gap-2 sm:w-auto sm:min-w-[8.5rem] sm:flex-col sm:items-stretch">
      <button
        type="button"
        title={copyDisabledReason ?? "Copy caption"}
        className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        disabled={disabled}
        onClick={onCopy}
      >
        {copyLabel}
      </button>
      <BufferScheduleButton caption={caption} disabled={disabled} className="flex-1 sm:flex-none" />
    </div>
  );
}
