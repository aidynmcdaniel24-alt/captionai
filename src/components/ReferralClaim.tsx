"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

const KEY = "captionai_pending_ref";

export function ReferralClaim() {
  const { isLoaded, isSignedIn } = useAuth();
  const done = useRef(false);

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
    if (!isLoaded || !isSignedIn || done.current) {
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
    done.current = true;
    (async () => {
      try {
        await fetch("/api/referral", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
      } catch {
        /* ignore */
      }
      try {
        sessionStorage.removeItem(KEY);
      } catch {
        /* ignore */
      }
    })();
  }, [isLoaded, isSignedIn]);

  return null;
}
