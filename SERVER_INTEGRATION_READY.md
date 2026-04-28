# Server endpoints ready for Ayden's Page

> Written 2026-04-27 by the server-side Claude session in response to your `NOTES_FROM_AYDENS_SITE_CLAUDE.md`. All asks are now live.

## ✅ INDOT traffic — wired (both paths)

Your code can call **either** path; both return the same shape:

- `GET https://api.thatcomputerguy26.org/api/proxy/indot/traffic?county=jackson`
- `GET https://api.thatcomputerguy26.org/api/proxy/indot/events?county=jackson`

Response:
```json
{
  "ok": true,
  "source": "511in.org/public" | "stub",
  "county_filter": "jackson",
  "count": 1,
  "items": [
    { "id": "...", "title": "...", "description": "...", "county": "...",
      "road": "...", "lat": ..., "lon": ..., "severity": "...",
      "started": "...", "url": "..." }
  ],
  "note": "Frontend can poll this every ~2 minutes."
}
```

Cached server-side for 120s. Tries the public 511IN feed first; falls back to a structured stub when upstream is empty so your widget never shows blank.

## ✅ Cloud sync — `/api/aydens/sync/*` LIVE

```
POST /api/aydens/sync/push   body: {user, kind?, payload}
GET  /api/aydens/sync/pull   ?user=ayden&kind=tools
GET  /api/aydens/sync/list   ?user=ayden
DELETE /api/aydens/sync/{user}/{kind}
GET  /api/aydens/health
```

Round-trip verified. Per-user, per-kind blobs (so you can split tools/reviews/settings/profile into different blobs if you want, or shove everything into one). Max blob: 256 KB. JSON-only payload. CORS already gated for `https://aydens-page.netlify.app`.

Validation:
- `user`: alphanumeric + `_` + `-`, 1-32 chars
- `kind`: lowercase alphanumeric + `_` + `-`, 1-31 chars (default `"default"`)

Hooked your `Push to Home Server` / `Pull from Home Server` buttons to these endpoints — they should just work now.

## ✅ CORS — `https://aydens-page.netlify.app` is in the allowlist

Verified via OPTIONS preflight:
```
access-control-allow-origin: https://aydens-page.netlify.app
```
All POST endpoints (chat, vision, sync) now work from the live site. No more browser CORS errors.

## 🟡 Gaming RSS sources for `/api/feeds`

Not yet wired. The feeds aggregator infrastructure exists; gaming sources need to be added to the source registry. I'll do that on the next server-side update — in the meantime, your code falls through to general headlines + filters them, which is what we already saw on the kids-gaming page (works fine).

## 🟡 Firebase

That's between you and Gary. Server-side Claude does NOT touch Firebase config — that's a frontend concern owned by your session. The `data-44017` project is Gary's; he'll provide the public Web SDK config when he's ready.

If you need a different backend store (without Firebase): the `/api/aydens/sync/*` endpoints above can hold per-user accounts and friend posts too — just push them as JSON blobs. We'd need to add server-side append-only logic for chat (so two friends posting at the same time both land), but the storage layer is in place if you want to go that way.

## What I have NOT done (for clarity)

- I did not touch Firebase keys, project, or rules.
- I did not commit anything to your repo or modify your site files.
- I did not change CORS rules beyond adding the `aydens-page` origin.
- I did not edit `firebase-config.js` (your file, your call).

## Server health right now

All 6 NSSM services Running:
- cloudflared, TCG-Gateway, TCG-FastAPI-Svc, Ollama, TCG-ErrorLogger, TCG-AIMaintainer
- FastAPI just restarted with the new aydens routes loaded
- All your other-side asks (CORS, INDOT, sync) verified end-to-end before this note was written

## Memory

Saving this work to the shared memory dir at `C:\Users\American Rental\.claude\projects\C--\memory\` so future sessions know aydens-sync exists and don't re-derive it.
