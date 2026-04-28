# Connection points for Ayden's site

> Written 2026-04-27 by Claude (the session working on Gary's main TCG / IBE / amickbabysitting build-out). Drop-in reference for the Claude session building Ayden's site so it can plug into Gary's home server without re-deriving everything.

## TL;DR

- **Base URL** for everything: `https://api.thatcomputerguy26.org`
- **No auth** required for `/api/public/*` and most `/api/proxy/*` and `/api/seymour/*` endpoints
- **CORS** is a strict allowlist server-side. Ayden's site origin must be added to `app.db.allowed_origins` for cross-origin POSTs to work. See "CORS allowlist" below for how to add.
- **All AI runs locally** on Gary's RTX 5060 + 32 GB host in Seymour, IN. No cloud LLM calls. Models are small and CPU-friendly.

## Hardware + model context (set realistic expectations)

- Server: Ryzen 7 5700 + 32 GB RAM + RTX 5060 8 GB VRAM, Windows 11
- Stack: FastAPI behind Caddy `:9443` behind Cloudflare Tunnel
- Models: tcg-assistant (chat, ~gemma3:1b base, fast), tcg-summarizer, tcg-coder, tcg-debugger, tcg-codecomplete, tcg-vision (moondream base) — all custom Modelfile builds with system prompts baked in
- Inference latency: chat 500ms-3s; vision 2-8s; summarize 1-5s
- Hard rules: no Qwen on this host (Gary's standing rule). No 7B+ models — they crashed the host.

## Public AI gateway — `/api/public/*`

Each route POSTs to the matching tcg-* model. Audit-logged. Rate-limited (60 req/min/IP global).

| Endpoint | Method | Body | Returns |
|---|---|---|---|
| `/api/public/chat` | POST | `{prompt, system?}` | `{ok, model, reply, eval_count}` |
| `/api/public/summarize` | POST | `{text}` (≤20k chars) | `{ok, model, summary, eval_count}` |
| `/api/public/code` | POST | `{prompt, debug?:bool}` | `{ok, model, reply, eval_count}` |
| `/api/public/vision` | POST | multipart: `file` (jpg/png/webp ≤5MB), `prompt` | `{ok, model, analysis, eval_count}` |
| `/api/public/vision-deep` | POST | multipart same as above | uses gemma3:4b for deeper reasoning |
| `/api/public/ai-routes` | GET | — | `{routes:[...], limits:{...}}` discovery |

Example chat call:

```js
const r = await fetch('https://api.thatcomputerguy26.org/api/public/chat', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({ prompt: 'Hello', system: 'You are concise.' })
});
const d = await r.json();
// d.reply has the text
```

Example vision call (image upload):

```js
const fd = new FormData();
fd.append('file', fileInput.files[0]);
fd.append('prompt', 'What is in this image?');
const r = await fetch('https://api.thatcomputerguy26.org/api/public/vision', {
  method: 'POST', body: fd
});
const d = await r.json();
// d.analysis has the description
```

Image safety on the server side: MIME sniffed (magic bytes, not declared), 5 MB cap, EXIF stripped before passing to model.

## Other useful public endpoints

| Endpoint | Purpose |
|---|---|
| `/api/public/findings?limit=10&q=...&county=...&severity=...` | IBE published findings search |
| `/api/public/tips` (POST `{subject, story, county}`) | Submit a tip |
| `/api/public/stats` | `{businesses, complaints, filings, subscribers}` |
| `/api/public/stocks/watchlist` | Live stock watchlist with signals (BUY/HOLD/SELL) + indicators (SMA20/50, RSI14) |
| `/api/public/stocks/quote?symbol=AAPL` | Single quote |
| `/api/public/stocks/analyze?symbol=AAPL` | AI commentary on a symbol |
| `/api/proxy/coingecko/markets?per_page=12` | Top crypto |
| `/api/proxy/usgs/quakes?feed=2.5_week` | Earthquakes (GeoJSON) |
| `/api/proxy/gdacs/disasters` | Global disaster alerts |
| `/api/proxy/news/headlines?category=...` | RSS aggregator |
| `/api/proxy/dns/<host>?type=A` | DNS lookup proxy |
| `/api/proxy/ipgeo/<ip>` | IP geolocation proxy |
| `/api/proxy/weather/forecast?lat=...&lon=...&days=14` | Open-Meteo forecast |
| `/api/seymour/sitrep` | Seymour situation report (weather, threat, alerts, flood) |
| `/api/seymour/threat` | Threat composite score (0-100) |
| `/api/seymour/weather` | Current Seymour weather |
| `/api/seymour/alerts` | Active NWS alerts for the area |
| `/api/seymour/cameras` + `/api/seymour/cameras/proxy/{id}` | Public camera snapshots |
| `/api/world/sitrep` | Global signal aggregator (news, conflicts, markets, disasters, cyber, space) |
| `/api/world/predictions?category=world\|conflicts\|markets\|disasters\|cyber\|space\|local\|military\|ai\|health\|politics\|all` | AI synthesis (non-blocking; first call returns "synthesizing" status, poll every 10s for ~30-60s) |

## Civic search URL builders — `/api/civic/*`

These return `{url, note}` — pre-fill the official portal URL, no scraping. Click through to the live state portal.

| Endpoint | Inputs |
|---|---|
| `/api/civic/indiana/mycase` | `?defendant=&case_number=&county=` |
| `/api/civic/indiana/idoc-offender` | `?name=&doc_number=` |
| `/api/civic/indiana/county-clerk` | `?county=Jackson` |
| `/api/civic/indiana/state-police` | `?name=` |
| `/api/civic/kentucky/aoc-fastcheck` | (none — opens portal) |
| `/api/civic/kentucky/kool-offender` | `?name=&doc_number=` |
| `/api/civic/scotus/case` | `?q=` |
| `/api/civic/pacer/lookup` | `?case=` |
| `/api/civic/federal/register` | `?q=` |
| `/api/civic/federal/bills` | `?q=` |
| `/api/jails/search` | `?county=Jackson&name=` (returns VINELink URL) |

## Reference data (read-only, no auth)

| Endpoint | Purpose |
|---|---|
| `/api/scotus/cases?q=Miranda` | 9,277 SCOTUS cases (1791-2024) |
| `/api/uscode/title/{n}/info` | US Code title metadata (titles 1-54) |
| `/api/uscode/constitution/{section}` | Full Constitution (preamble, articles, amendments) |
| `/api/bible/{translation}/{ref}` | 9 Bible translations via bible-api proxy |
| `/api/history/?kind=&q=` | Curated historical events index |
| `/api/idoh/overdose/historical` | Indiana statewide overdose deaths by year |
| `/api/idoh/overdose/latest` | Latest year snapshot |

## CORS allowlist — IMPORTANT

The server enforces a strict CORS allowlist (28 entries currently in `app.db.allowed_origins`, live-loaded). Cross-origin POST from a new origin will fail with no CORS headers if the origin isn't in the allowlist.

To add Ayden's site origin: someone with admin auth needs to call (or have Gary do it via the admin UI):

```
POST /api/admin/cors/origins
{"origin": "https://aydens-site.netlify.app"}
```

OR Gary can drop a one-line INSERT into `data/app.db`:

```sql
INSERT INTO allowed_origins (origin, added_by, added_at) VALUES ('https://aydens-site.netlify.app', 'manual', strftime('%s','now'));
```

(Live-loaded — no FastAPI restart needed.)

GET requests to `/api/public/*` and `/api/proxy/*` work from any origin (read-only, no CORS issue).

## Gotchas

- **Responses are JSON** unless explicitly an image (cameras proxy) or text. Always `await r.json()` not `r.text()`.
- **Model load is non-trivial.** First inference call after a quiet period takes 5-15s for cold model load. Subsequent calls are 200-3000ms. Show a "thinking…" UI.
- **Vision routes use `multipart/form-data`** — don't `JSON.stringify` them. Use FormData.
- **Stocks data refresh** is on the server, not realtime. Watchlist refreshes every ~60s server-side.
- **No WebSockets** on the public surface yet. Use polling (10-30s interval is fine).
- **CSP**: if Ayden's site uses CSP, add `connect-src https://api.thatcomputerguy26.org` and `img-src` to allow camera proxy images.

## Currently in progress (other Claude session)

This Claude session is in the middle of:
1. ✅ Predictions site fix (military/ai/health/politics + map dispatch)
2. ✅ Tools page upgrade (6 new server-powered cards)
3. ✅ Stocks page full rewrite (sortable table, signal filters, AI commentary)
4. ✅ Civic-hub upgrade (live Indiana watch + AI civic helpers)
5. ✅ amickbabysitting Seymour Monitor + Chat-Gary direct (with RTDB push to NEVAEH)
6. ✅ Control-center playground (chat/summarize/code/vision UI)
7. ✅ Defensive agent (Observer/Analyst/Policy/Executor with allowlist)
8. ✅ Custom tcg-* Modelfiles (assistant/summarizer/coder/debugger/codecomplete/vision)

Open queue items: tcgsolutions navbar dropdowns + projects layout + content expansion, southern-indiana-justice full upgrade, tcgpredictions full upgrade, Caddy hardening (block dangerous Ollama endpoints).

Memory files (so future sessions of either Claude can pick up): see `C:\Users\American Rental\.claude\projects\C--\memory\MEMORY.md` for the master index.

Don't re-derive what's already done. If unsure whether something exists, hit `/api/public/ai-routes` for the public AI catalog or `/api/openapi.json` (493+ routes) for the full surface.

## Quick starter HTML for Ayden's site

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ayden's site</title>
<style>body{font:14px system-ui,sans-serif;padding:24px;max-width:680px;margin:0 auto}</style>
</head>
<body>
<h1>Ayden's site</h1>
<p>Connected to Gary's home server at <code>api.thatcomputerguy26.org</code>.</p>

<h2>Try the AI</h2>
<input id="q" style="width:100%;padding:8px" placeholder="Ask anything…">
<button onclick="ask()">Send</button>
<pre id="out"></pre>

<script>
const API = 'https://api.thatcomputerguy26.org';
async function ask() {
  const q = document.getElementById('q').value.trim();
  if (!q) return;
  document.getElementById('out').textContent = 'Thinking…';
  try {
    const r = await fetch(API + '/api/public/chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ prompt: q })
    });
    const d = await r.json();
    document.getElementById('out').textContent = d.reply || JSON.stringify(d, null, 2);
  } catch (e) {
    document.getElementById('out').textContent = 'Error: ' + e.message;
  }
}
</script>
</body>
</html>
```

This works as-is with no auth, no signup, no CORS issues for GET/simple POST. Drop it in and iterate.
