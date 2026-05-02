import Groq from "groq-sdk";

export function getGroqClient() {
  const apiKey =
    process.env.GROQ_API_KEY?.trim().replace(/^["']|["']$/g, "") ||
    process.env.NEXT_PUBLIC_GROQ_API_KEY?.trim().replace(/^["']|["']$/g, "");

  if (!apiKey) {
    return null;
  }

  return new Groq({ apiKey });
}
