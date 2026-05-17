export type Theme = "light" | "dark";

/** Cookie and localStorage key for theme preference. */
export const THEME_STORAGE_KEY = "captionai-theme";

export function parseTheme(value: string | undefined | null): Theme | null {
  if (value === "light" || value === "dark") {
    return value;
  }
  return null;
}

/** Client-side: persist theme in a cookie (read by the server on the next request). */
export function writeThemeCookie(theme: Theme) {
  if (typeof document === "undefined") {
    return;
  }
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${THEME_STORAGE_KEY}=${theme};path=/;max-age=${maxAge};SameSite=Lax`;
}
