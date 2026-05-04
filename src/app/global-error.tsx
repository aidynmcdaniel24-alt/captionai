"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-center text-white">
        <h1 className="text-xl font-semibold">Application error</h1>
        <p className="mt-2 max-w-md text-sm text-zinc-400">{error.message}</p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white hover:bg-purple-500"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
