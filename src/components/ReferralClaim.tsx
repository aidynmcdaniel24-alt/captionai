"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const KEY = "captionai_pending_ref";

export function ReferralClaim() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const pathname = usePathname();
  const succeeded = useRef(false);

  useEffect(() => {
    succeeded.current = false;
  }, [userId]);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const fromUrl = sp.get("ref")?.trim();
    if (fromUrl) {
      try {
        sessionStorage.setItem(KEY, fromUrl);
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || succeeded.current) {
      return;
    }

    const sp = new URLSearchParams(window.location.search);
    let code = sp.get("ref")?.trim();
    if (!code) {
      try {
        code = sessionStorage.getItem(KEY)?.trim() ?? undefined;
      } catch {
        /* ignore */
      }
    }
    if (!code) {
      return;
    }

    const normalized = code.toLowerCase();
    let cancelled = false;

    (async () => {
      for (let attempt = 0; attempt < 8; attempt++) {
        if (cancelled) {
          return;
        }

        const res = await fetch("/api/referral", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ code: normalized }),
        });

        if (res.ok) {
          succeeded.current = true;
          try {
            sessionStorage.removeItem(KEY);
          } catch {
            /* ignore */
          }
          return;
        }

        if (res.status === 401) {
          await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
          continue;
        }

        // Definitive client errors: drop stored ref so we do not loop forever.
        if (res.status === 400) {
          succeeded.current = true;
          try {
            sessionStorage.removeItem(KEY);
          } catch {
            /* ignore */
          }
          return;
        }

        // 429 / 500 — retry a few times, then wait for another navigation (pathname dep).
        if (attempt < 4) {
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
          continue;
        }
        return;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, pathname]);

  return null;
}
