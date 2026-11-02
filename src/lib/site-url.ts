const DEFAULT_SITE_URL = "https://captionai-phi.vercel.app";

/** Public site origin without a trailing slash. Set NEXT_PUBLIC_APP_URL to override. */
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL?.trim() || DEFAULT_SITE_URL).replace(/\/$/, "");
