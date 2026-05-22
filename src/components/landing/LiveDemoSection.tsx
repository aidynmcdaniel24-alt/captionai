"use client";

import { motion } from "framer-motion";
import { useState } from "react";

const platforms = ["Instagram", "TikTok", "LinkedIn", "Twitter/X"] as const;
const tones = ["funny", "professional", "hype", "inspirational"] as const;

type Platform = (typeof platforms)[number];
type Tone = (typeof tones)[number];

export function LiveDemoSection() {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState<Platform>("Instagram");
  const [tone, setTone] = useState<Tone>("inspirational");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function runDemo() {
    setError("");
    setCaption("");
    setLoading(true);
    try {
      const res = await fetch("/api/captions/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, platform, tone }),
      });
      const data = (await res.json()) as { caption?: string; error?: string };
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      if (data.caption) {
        setCaption(data.caption);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copyCaption() {
    if (!caption) {
      return;
    }
    await navigator.clipboard.writeText(caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section id="demo" className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
            Try it live—no signup
          </h2>
          <p className="mt-3 text-base text-zinc-600 sm:mt-4 sm:text-lg dark:text-zinc-400">
            One AI caption on us. Create a free account anytime for three options per run and saved workflow.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="mx-auto mt-10 max-w-3xl rounded-3xl border border-purple-300/40 bg-gradient-to-b from-white to-zinc-50 p-5 shadow-2xl shadow-purple-500/10 sm:mt-14 sm:p-8 dark:border-purple-500/20 dark:from-zinc-900/90 dark:to-zinc-950/90 dark:shadow-purple-950/30"
        >
          <label className="mb-2 block text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
            What are you posting about?
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. sunset hike with my dog in Colorado"
            rows={3}
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-400 outline-none ring-purple-500/0 transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/25 dark:border-zinc-700 dark:bg-zinc-950/80 dark:text-white dark:placeholder:text-zinc-600 dark:focus:border-purple-500/50 dark:focus:ring-purple-500/30"
          />

          <div className="mt-4 grid gap-4 sm:mt-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-left text-sm text-zinc-600 dark:text-zinc-400">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                className="block min-h-[48px] w-full rounded-xl border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-purple-500/50"
              >
                {platforms.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-left text-sm text-zinc-600 dark:text-zinc-400">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as Tone)}
                className="block min-h-[48px] w-full rounded-xl border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-purple-500/50"
              >
                {tones.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={loading || !topic.trim()}
            onClick={runDemo}
            className="mt-6 inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-purple-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-purple-600/25 transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Generating…" : "Generate my caption"}
          </button>

          {error ? (
            <p className="mt-4 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}

          {caption ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-left sm:mt-8 sm:p-5 dark:border-zinc-700 dark:bg-black/30"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Your caption
              </p>
              <p className="mt-3 whitespace-pre-wrap break-words text-base leading-relaxed text-zinc-800 sm:text-lg dark:text-zinc-100">
                {caption}
              </p>
              <button
                type="button"
                onClick={copyCaption}
                className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 sm:w-auto dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-white/5"
              >
                {copied ? "Copied!" : "Copy caption"}
              </button>
            </motion.div>
          ) : null}
        </motion.div>
      </div>
    </section>
  );
}
