import "server-only";

import Groq from "groq-sdk";

const ENV_KEYS = ["GROQ_API_KEY", "NEXT_PUBLIC_GROQ_API_KEY"] as const;

/**
 * Reads Groq API key at request time (not module-init time) so values from `.env.local`
 * and Vercel runtime env are picked up reliably. Normalizes quotes/BOM/whitespace.
 */
function readGroqApiKey(): string | undefined {
  for (const name of ENV_KEYS) {
    const raw = process.env[name];
    if (raw === undefined || raw === "") {
      continue;
    }
    let k = raw.trim();
    k = k.replace(/^\uFEFF/, "");
    k = k.replace(/^["']|["']$/g, "");
    k = k.replace(/\r/g, "").trim();
    if (k.length === 0) {
      continue;
    }
    return k;
  }
  return undefined;
}

export function getGroqClient(): Groq | null {
  const apiKey = readGroqApiKey();

  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[Groq] No API key found. Set GROQ_API_KEY in `.env.local` in the `captionai/` folder (same level as package.json), then restart `npm run dev`. On Vercel, add GROQ_API_KEY under Environment Variables for Production (and Preview if needed), then redeploy."
      );
    }
    return null;
  }

  if (!apiKey.startsWith("gsk_") && process.env.NODE_ENV === "development") {
    console.warn(
      "[Groq] GROQ_API_KEY should usually start with gsk_. If Groq still rejects requests, replace the key from Groq Console → API Keys."
    );
  }

  return new Groq({ apiKey });
}
