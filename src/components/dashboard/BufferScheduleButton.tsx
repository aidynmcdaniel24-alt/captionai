"use client";

import { openBufferSchedule } from "@/lib/buffer-schedule";

type BufferScheduleButtonProps = {
  caption: string;
  disabled?: boolean;
  className?: string;
};

function BufferIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="none">
      <rect x="4" y="5" width="16" height="3" rx="1" fill="#168EEA" />
      <rect x="4" y="10.5" width="16" height="3" rx="1" fill="#168EEA" opacity="0.75" />
      <rect x="4" y="16" width="16" height="3" rx="1" fill="#168EEA" opacity="0.5" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
      />
    </svg>
  );
}

export function BufferScheduleButton({ caption, disabled, className = "" }: BufferScheduleButtonProps) {
  return (
    <button
      type="button"
      title="Schedule with Buffer"
      disabled={disabled}
      onClick={() => openBufferSchedule(caption)}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 transition hover:border-[#168EEA]/50 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-[#168EEA]/40 dark:hover:bg-sky-950/30 ${className}`}
    >
      <CalendarIcon className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
      <span>Schedule</span>
      <BufferIcon className="h-4 w-4 shrink-0" />
    </button>
  );
}
