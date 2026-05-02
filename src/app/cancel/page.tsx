import Link from "next/link";

export default function CancelPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 px-6 py-16 text-white">
      <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900/90 p-8 text-center shadow-xl">
        <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">Checkout canceled</p>
        <h1 className="mt-3 text-3xl font-semibold">No charge was made</h1>
        <p className="mt-4 text-zinc-300">
          You left the payment page before completing checkout. Your account is unchanged—you can upgrade anytime.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-flex justify-center rounded-xl border border-zinc-600 px-5 py-3 font-medium hover:bg-zinc-800"
          >
            Back to dashboard
          </Link>
          <Link
            href="/upgrade"
            className="inline-flex justify-center rounded-xl bg-purple-600 px-5 py-3 font-medium hover:bg-purple-500"
          >
            Try checkout again
          </Link>
        </div>
      </div>
    </main>
  );
}
