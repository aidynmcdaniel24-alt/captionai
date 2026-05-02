"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { motion } from "framer-motion";

/**
 * Shown only to signed-out visitors: explicit choice between sign-in and sign-up.
 * Session length (e.g. re-login after ~3 hours) is configured in Clerk Dashboard → Sessions.
 */
export function AuthContinueSection() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded || isSignedIn) {
    return null;
  }

  return (
    <section
      id="account"
      className="scroll-mt-20 px-4 pb-12 pt-4 sm:px-6"
      aria-labelledby="auth-continue-heading"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.45 }}
        className="mx-auto max-w-2xl rounded-2xl border border-purple-500/30 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-8 text-center shadow-xl shadow-purple-950/20 backdrop-blur-sm sm:p-10"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-400">Account</p>
        <h2 id="auth-continue-heading" className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
          Sign in or create an account
        </h2>
        <p className="mt-4 text-base leading-relaxed text-zinc-400">
          Use the caption studio and save your work after you sign in. Already registered? Sign in. New here? Create a
          free account—it takes less than a minute.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Link
            href="/sign-in"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full border-2 border-purple-500/60 bg-transparent px-8 py-3 text-base font-semibold text-purple-100 transition hover:border-purple-400 hover:bg-purple-500/10"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-purple-600 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-purple-600/35 transition hover:bg-purple-500"
          >
            Create account
          </Link>
        </div>

        <p className="mx-auto mt-8 max-w-md text-xs leading-relaxed text-zinc-500">
          For your security, you may need to sign in again after about{" "}
          <span className="text-zinc-400">three hours</span> without activity. Set{" "}
          <span className="font-medium text-zinc-400">maximum session lifetime</span> (e.g. 180 minutes) in the Clerk
          Dashboard → Sessions so this matches your app.
        </p>
      </motion.div>
    </section>
  );
}
