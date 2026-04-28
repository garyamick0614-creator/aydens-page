# Handoff — aydens-page is now yours

Written 2026-04-27 by the Claude session that built the initial Ayden's Page.
Gary explicitly handed the project to you. I'm out; this file is everything you
need to pick up cleanly.

## Live state

- **Site:** https://aydens-page.netlify.app — production deploy `1bae92d`
- **Repo:** https://github.com/garyamick0614-creator/aydens-page (public, owner `garyamick0614-creator`)
- **Netlify project:** `aydens-page` on team `BabysittingPortal` (id `bd3b23d8-aab5-4906-88bc-f35c2f5376b5`)
- **Local:** `C:\Users\American Rental\Desktop\aydens site` — linked to that Netlify project via `.netlify/state.json`
- Working tree is clean as of this handoff. Everything committed and pushed.

## What's wired up

### Server side (you/Gary's other session shipped these — thank you)
- CORS allowlist includes `https://aydens-page.netlify.app` — verified live
- `/api/proxy/indot/traffic` alias of `/events`
- `/api/aydens/sync/{push,pull,list,health}` — backup endpoints, contract `{user, kind, payload}`, max 256 KB
- All other endpoints from CONNECTION_POINTS.md still in use

### Frontend (this site)
- 9 tabs: Home / Xbox / PC / Minecraft / Rocket / AI Buddy / Friends / Control / Help
- Animated neon background (canvas particles + CSS gradient mesh)
- **Real**: weather (multi-city, `/api/proxy/weather/forecast`), space stats (`/api/world/sitrep`), kids news (`/api/proxy/news/headlines` with strict allowlist filter), AI Buddy + per-game daily AI tips (`/api/public/chat`), Test My PC (browser specs + WebGL + CPU benchmark), Test My Internet (5x ping + multi-fetch download), Server Health, 25 organizer tools (localStorage), JSON backup/restore + cloud sync
- Firebase Web SDK wired for project `data-44017` — Auth (Email/Password) + Realtime Database. Config in `firebase-config.js` is filled in.
- Footer: "Created by Gary Amick at TCG"

## Things you should know about the design

1. **Hard rule from Gary, repeated several times: no mocks, no placeholders, no simulations.** AI-generated content is real. localStorage is real. Firebase config gaps are environment dependencies, not placeholders. If a feature can't be real today, it's left out — not stubbed.

2. **Kid-safe filter is allowlist-only for news.** A headline only shows if it explicitly matches a positive topic (gaming/sports/space/animals/kids/etc.) AND survives a topic blocklist + source blocklist + category blocklist. Default deny. Better to show "Nothing kid-safe right now — go play a game!" than leak war/violence/crime. Filter is in `script.js` under `newsHeadlineSafe()`. If something slips through, add the exact word/source to `NEWS_TOPIC_BLOCK` or the source list — don't loosen the allowlist.

3. **Two-sided kid-safe filter** runs on AI Buddy + Server Chat: input must pass `kidSafeAllow` before send; output is run through `kidSafeText` before display.

4. **Admin password defaults to `password123`**, sha256-hashed in localStorage at key `aydenhq:adminPwdHash:v2`. The `:v2` suffix exists because v1 had a JSON-stringify mismatch bug that made login impossible — bumping the key forced a clean reset for existing users. There's a "RESET TO DEFAULT" button on the gate as a permanent failsafe.

5. **Cache strategy**: all asset URLs in `index.html` are cache-busted with `?v=20260427e`. `_headers` enforces `Cache-Control: no-cache, no-store, must-revalidate` for `index.html` and `kids.html`, plus `max-age=0, must-revalidate` for JS/CSS. If you change JS/CSS, **bump the `?v=` query string in index.html** — that's the actual cache invalidator (header-only revalidation isn't reliable across browsers).

6. **`measurementId` is in `firebase-config.js` per Gary's explicit request, but Google Analytics is NOT active**: nothing imports `firebase-analytics.js` or calls `getAnalytics(app)`. Don't add either — it's a child-targeted site and GA isn't COPPA-compliant. There's a comment block in firebase-config.js as a guard rail.

7. **Firebase RTDB rules are NOT yet applied** — the database may still be in test mode. You recommended namespacing under `aydens-page/`; suggested rules are inline in `firebase-config.js`. The code currently writes to root-level `users/`, `posts/`, `blocked/` — change those paths in `script.js` (search for `'users/'`, `'posts'`, `'blocked'`) when you apply namespaced rules.

## Open items handed to you

### Server-side (your area)
1. **Kid-safe news endpoint** — you mentioned you were adding this. The frontend already auto-tries `/api/proxy/news/kids`, `/api/proxy/news/headlines?safe=kids`, `/api/kids/news` in order before falling back to the general feed + client filter. Whichever path you ship, it'll just work.
2. **Gaming RSS sources** for the feeds aggregator (`news.xbox.com`, `minecraft.net/news`, `rocketleague.com/news`, `blogs.windows.com/devices`). Per-game news widgets activate the moment those land.
3. **Firebase RTDB rules** — apply the namespaced version from `REVIEW_FROM_SERVER_CLAUDE.md` and update the database away from test mode. Then update the script.js paths to match.

### Frontend things I'd do next if I were continuing
1. Profile editor in the Friends tab (let users edit their own gaming-tag profile from there, not just from Control). The data model is already in place.
2. Reminders / bedtime tool currently lacks browser notification API hookup — easy add, just needs `Notification.requestPermission()` flow.
3. Mobile polish on the modal (works but could be better on small phones).

## Files in the repo

- `index.html` — 9 tabs, all panels in one file. Asset references cache-busted.
- `styles.css` — neon theme, per-tab CSS variable accent, animations.
- `background.js` — canvas particle field with mouse repulsion.
- `firebase-config.js` — Web SDK config for project `data-44017`.
- `script.js` — main app (~1200 lines): tabs, API, kid-safe filter, admin, 25 tools, diagnostics, Firebase chat. Search by section comment headers.
- `_headers` — strict CSP, HSTS, framing deny, no-cache for HTML, etc. (Note: `_headers` was tightened by Gary or a linter at the very end of the session — keep the no-cache/no-store/must-revalidate values.)
- `netlify.toml` — static site config + SPA fallback.
- `.gitignore` — standard.
- `kids.html`, `quickstart.html` — your earlier work, untouched by me.
- `CONNECTION_POINTS.md`, `HANDOFF_FROM_OTHER_CLAUDE.md` — your originals, preserved.
- `SERVER_INTEGRATION_READY.md`, `REVIEW_FROM_SERVER_CLAUDE.md` — your responses, preserved.
- `NOTES_FROM_AYDENS_SITE_CLAUDE.md` — this file.

## Memory

I saved `project_aydens_page.md` in the shared memory dir at `C:\Users\American Rental\.claude\projects\C--\memory\` and updated it with the final state. Read it for the one-glance summary.

Good luck. Ayden's going to love it.
