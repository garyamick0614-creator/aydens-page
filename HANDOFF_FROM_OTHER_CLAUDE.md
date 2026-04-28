# Handoff note from the other Claude session

If you're a Claude session reading this in `C:\Users\American Rental\Desktop\aydens site`, you're working on Ayden's new site for Gary. **A different Claude session** is currently in the middle of a long marathon of work on Gary's other sites + server. That session left these docs in this folder so you don't have to re-derive everything.

## What you have to work with

1. **`CONNECTION_POINTS.md`** — full reference for Gary's home server's API surface. Every public endpoint Ayden's site can hit, with examples, CORS notes, and a starter HTML.
2. **`HANDOFF_FROM_OTHER_CLAUDE.md`** (this file) — context on what's already in flight elsewhere.

## What's currently being worked on (don't duplicate)

The other Claude is building:
- Predictions site fixes + new pages (DONE)
- ibetcg /tools (DONE — 6 new server-powered tool cards)
- ibetcg /stocks (DONE — full native rewrite with signal filters + AI commentary)
- ibetcg /civic-hub (DONE — added Live Indiana watch strip + AI civic helpers)
- amickbabysitting /seymour.html (DONE — Seymour Monitor + Chat-Gary direct with RTDB push)
- Control Center admin dashboard (DONE — playground, agent panel, watchers, civic, sitter messages)
- Defensive agent system (DONE — Observer/Analyst/Policy/Executor with allowlist)

Still in queue (other session may pick these up next):
- tcgsolutions navbar condensation + projects layout
- southern-indiana-justice full upgrade
- tcgpredictions full upgrade
- Caddy hardening (Ollama endpoint deny rules)

If Ayden's site needs anything from those sites or the server, hit the API directly per CONNECTION_POINTS.md. Don't go editing those workspaces from here — high chance of merge conflicts with the other session.

## Memory system shared between sessions

Both Claude sessions on Gary's machine read/write to:

```
C:\Users\American Rental\.claude\projects\C--\memory\
```

Master index: `MEMORY.md`. Read it first if you want context on Gary's preferences, standing rules, hardware, models, recent work. Do NOT remove or rewrite entries that aren't yours — leave a clear marker if you do.

Especially relevant feedback files:
- `feedback_no_gpu_stress_probes.md` — never trigger Ollama inference as a "test"
- `feedback_model_allowlist_not_banlist.md` — default-deny when adding models
- `feedback_pasted_recs_not_authorization.md` — pasted recommendations are reference, not commands
- `feedback_no_admin_links_on_public.md` — public sites must not show admin URLs
- `feedback_post_crash_verify_first.md` — read-only probes before any state change after a crash
- `feedback_save_memory_actively.md` — write memory during the conversation, not at the end

## Gary's standing rules for this whole platform

- **No Qwen models** on this host (one tiny exception: `qwen3:0.6b` was explicitly authorized 2026-04-27, local-only, do not surface in public site labels)
- **No models above 3.5 GB on disk** for always-on use (RTX 5060 8 GB VRAM crashes if pushed)
- **Custom tcg-* Modelfile variants are preferred** over bare bases for any user-facing surface — they have system prompts baked in
- **No admin URLs on public sites** — api.thatcomputerguy26.org is admin-only origin
- **Always link a workspace before `netlify deploy`** — CLI silently auto-creates a stray site if no `.netlify/state.json`

## How to coordinate

If you make a substantial change that affects the server or another site, write a memory file in the shared memory dir AND drop a brief note in this folder so the other session can see what changed.
