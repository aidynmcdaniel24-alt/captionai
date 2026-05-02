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
    <section id="demo" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Try it live—no signup</h2>
          <p className="mt-4 text-lg text-zinc-400">
            One AI caption on us. Create a free account anytime for three options per run and saved workflow.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="mx-auto mt-14 max-w-3xl rounded-3xl border border-purple-500/20 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-6 shadow-2xl shadow-purple-950/30 sm:p-8"
        >
          <label className="mb-2 block text-left text-sm font-medium text-zinc-300">
            What are you posting about?
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. sunset hike with my dog in Colorado"
            rows={3}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-4 py-3 text-white placeholder:text-zinc-600 outline-none ring-purple-500/0 transition focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/30"
          />

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-left text-sm text-zinc-400">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-white outline-none focus:border-purple-500/50"
              >
                {platforms.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-left text-sm text-zinc-400">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as Tone)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-white outline-none focus:border-purple-500/50"
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
            className="mt-6 w-full rounded-xl bg-purple-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-purple-600/25 transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Generating…" : "Generate my caption"}
          </button>

          {error ? (
            <p className="mt-4 text-center text-sm text-red-400">{error}</p>
          ) : null}

          {caption ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 rounded-2xl border border-zinc-700 bg-black/30 p-5 text-left"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-purple-400">Your caption</p>
              <p className="mt-3 whitespace-pre-wrap text-lg leading-relaxed text-zinc-100">{caption}</p>
              <button
                type="button"
                onClick={copyCaption}
                className="mt-4 rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5"
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
