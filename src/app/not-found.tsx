import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-purple-600 dark:text-purple-400">
        404
      </p>
      <h1 className="text-3xl font-semibold text-zinc-900 dark:text-white">Page not found</h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        That URL doesn&apos;t exist or may have moved. Head home or open your dashboard.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white hover:bg-purple-500"
        >
          Home
        </Link>
        <Link
          href="/dashboard"
          className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Dashboard
        </Link>
      </div>
    </main>
  );
}
