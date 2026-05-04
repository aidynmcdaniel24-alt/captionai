"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useCallback, useEffect, useRef } from "react";

const IDLE_MS = 30 * 60 * 1000;

export function InactivityLogout() {
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (!isSignedIn) {
      return;
    }
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => {
      void signOut({ redirectUrl: "/sign-in?reason=idle" });
    }, IDLE_MS);
  }, [isSignedIn, signOut]);

  useEffect(() => {
    if (!isSignedIn) {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      return;
    }
    reset();
    const ev = ["mousedown", "keydown", "touchstart", "scroll", "visibilitychange"] as const;
    const onVis = () => {
      if (document.visibilityState === "visible") {
        reset();
      }
    };
    for (const e of ev) {
      if (e === "visibilitychange") {
        document.addEventListener(e, onVis);
      } else {
        window.addEventListener(e, reset, { passive: true });
      }
    }
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      for (const e of ev) {
        if (e === "visibilitychange") {
          document.removeEventListener(e, onVis);
        } else {
          window.removeEventListener(e, reset);
        }
      }
    };
  }, [isSignedIn, reset]);

  return null;
}
