"use client";

import { useEffect } from "react";

/**
 * Registers the CaptionAI service worker on mount. Lives in <ClientProviders>
 * so it runs on every authenticated page once the user has hydrated.
 *
 * The actual file lives at /public/sw.js and is served from the root scope.
 * The browser is responsible for cache invalidation — the SW bumps its own
 * CACHE_VERSION constant when assets change.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          console.warn("[pwa] service worker registration failed:", err);
        });
    };

    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad, { once: true });
      return () => window.removeEventListener("load", onLoad);
    }
  }, []);

  return null;
}
