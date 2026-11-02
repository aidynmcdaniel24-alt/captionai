# Studio test checklist (run once on the preview)

Sign in on the preview URL, open the Studio, and try each tab once.
Pass = a real result appears, no red error. Fail = a 500 or "Could not..." message.

Tabs marked Pro or Annual need that plan. Use your admin account, or set
`plan` to `annual` for your user in the Supabase `subscriptions` table.

| # | Tab | Plan | What to do | Calls |
|---|-----|------|-----------|-------|
| 1 | Captions | Free | Topic "sunset hike with my dog", Instagram, generate | `captions/generate` |
| 1b | Captions | Free | Switch to TikTok and LinkedIn, generate each | `captions/generate` |
| 1c | Captions | Free | Upload a JPG, click describe/use image | `captions/describe-image` |
| 1d | Captions | Free | On a result, use "optimize length" | `tools/optimize-length` |
| 2 | Hashtags | Free | Topic + platform, generate | `tools/hashtags` |
| 3 | Bio | Free | Enter a niche, generate | `tools/bio` |
| 4 | Rewriter | Pro | Paste a caption, rewrite; then translate it | `tools/rewrite`, `tools/translate-caption` |
| 5 | Emojis | Pro | Paste a caption, suggest emojis | `tools/emoji-suggest` |
| 6 | Trending | Free | Pick a platform and category | `trending` |
| 7 | A/B Test | Free | Generate an A/B pair | `tools/ab-pair` |
| 8 | Hashtags+ | Annual | Analyze a set of hashtags | `tools/hashtag-analyzer` |
| 9 | Grader | Annual | Grade a caption; run competitor analysis | `tools/grade-caption`, `tools/competitor-analyze` |
| 10 | Calendar | Annual | Generate a calendar | `tools/caption-calendar` |
| 11 | Best time card | Free | Open the Studio home, check the best-time card | `tools/best-time` |
| 12 | Hook Library | Free | Open it, copy a hook (no AI) | none |
| 13 | Analytics | Pro | Open it (no AI) | none |
| 14 | Brand Tone | Annual | Save a brand voice, then generate on Captions | none, then `captions/generate` |
| 15 | Favorites | Free | Favorite a caption, open the tab | none |
| 16 | Collections | Pro | Create a collection, save a caption | none |

Also check:
- Landing page demo: click a chip, a caption appears.
- Submit a test testimonial: it saves and is not stuck on a moderation error.

If a tab fails, note the tab name and the red message. The API logs the model
name with each failure, so it shows up in the admin logs.
