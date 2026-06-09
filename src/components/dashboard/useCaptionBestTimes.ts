"use client";

import type { BestTimeRecommendation } from "@/lib/best-time-recommendations";
import { getBestTimeRecommendation } from "@/lib/best-time-recommendations";
import type { CaptionRatingKey } from "@/lib/caption-rating-styles";
import { useEffect, useMemo, useState } from "react";

type UseCaptionBestTimesArgs = {
  captions: string[];
  ratings: CaptionRatingKey[];
  platform: string;
  tone: string;
  topic?: string;
  enabled?: boolean;
};

export function useCaptionBestTimes({
  captions,
  ratings,
  platform,
  tone,
  topic = "",
  enabled = true,
}: UseCaptionBestTimesArgs) {
  const [recommendations, setRecommendations] = useState<(BestTimeRecommendation | null)[]>([]);
  const [loading, setLoading] = useState(false);

  const payloadKey = useMemo(() => {
    if (!enabled || captions.length === 0) {
      return "";
    }
    return JSON.stringify({
      captions,
      ratings,
      platform,
      tone,
      topic: topic.trim(),
    });
  }, [captions, ratings, platform, tone, topic, enabled]);

  useEffect(() => {
    if (!payloadKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear state when the payload becomes empty (deps change)
      setRecommendations([]);
      setLoading(false);
      return;
    }

    const ac = new AbortController();
    const t = window.setTimeout(() => {
      setLoading(true);
      void (async () => {
        try {
          const parsed = JSON.parse(payloadKey) as {
            captions: string[];
            ratings: CaptionRatingKey[];
            platform: string;
            tone: string;
            topic: string;
          };
          const res = await fetch("/api/tools/best-time-captions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              platform: parsed.platform,
              tone: parsed.tone,
              topic: parsed.topic,
              items: parsed.captions.map((caption, i) => ({
                caption,
                rating: parsed.ratings[i] ?? "medium",
              })),
            }),
            signal: ac.signal,
          });
          const data = (await res.json()) as {
            recommendations?: BestTimeRecommendation[];
            times?: string[];
            error?: string;
          };
          if (ac.signal.aborted) {
            return;
          }
          if (res.ok && Array.isArray(data.recommendations)) {
            setRecommendations(data.recommendations);
          } else if (res.ok && Array.isArray(data.times)) {
            setRecommendations(
              data.times.map((time, i) =>
                getBestTimeRecommendation({
                  platform: parsed.platform,
                  topic: parsed.topic,
                  tone: parsed.tone,
                  caption: parsed.captions[i],
                  rating: parsed.ratings[i] ?? "medium",
                })
              )
            );
          } else {
            setRecommendations(
              parsed.captions.map((caption, i) =>
                getBestTimeRecommendation({
                  platform: parsed.platform,
                  topic: parsed.topic,
                  tone: parsed.tone,
                  caption,
                  rating: parsed.ratings[i] ?? "medium",
                })
              )
            );
          }
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") {
            return;
          }
          if (!ac.signal.aborted) {
            const parsed = JSON.parse(payloadKey) as {
              captions: string[];
              ratings: CaptionRatingKey[];
              platform: string;
              tone: string;
              topic: string;
            };
            setRecommendations(
              parsed.captions.map((caption, i) =>
                getBestTimeRecommendation({
                  platform: parsed.platform,
                  topic: parsed.topic,
                  tone: parsed.tone,
                  caption,
                  rating: parsed.ratings[i] ?? "medium",
                })
              )
            );
          }
        } finally {
          if (!ac.signal.aborted) {
            setLoading(false);
          }
        }
      })();
    }, 400);

    return () => {
      window.clearTimeout(t);
      ac.abort();
    };
  }, [payloadKey]);

  const times = recommendations.map((r) => r?.time ?? null);

  return { times, recommendations, loading };
}
