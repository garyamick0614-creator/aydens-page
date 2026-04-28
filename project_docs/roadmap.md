# PlaygroundArchitect — Roadmap

> Scaffolded by lead-dev Claude 2026-04-27 from Gary's stated 4-phase vision.
> This is the working interpretation; replace any section with your authoritative version when ready.

## Vision

Evolve `aydens-page.netlify.app` from a static "kid HQ" into a **Shared Playground** —
a real-time, multi-user interactive surface where every visitor is an entity in a
synced world. Bold, touch-friendly, gamified, low-friction (no login).

## Phase 1 — Foundation (THIS PHASE — shipping now)

**Goal:** Two friends open the site, see each other's cursors moving in real time,
each leaving particle trails. Sub-50ms perceived latency. Zero React re-renders
during interaction.

- `PlaygroundProvider` — Firebase init + Anonymous Auth + React context
- `usePresence` hook — local mouse → useRef → throttled RTDB write at 30Hz
- `usePresencePeers` hook — subscribe to `/playground/presence`, expose peer ref map
- `PresenceManager` component — render a circle per active visitor via direct DOM mutation
- `ParticleField` component — canvas-based mouse-trail particles (own rAF loop)
- Schema: `/playground/presence/{uid}` ephemeral via `onDisconnect().remove()`

**Performance contract:**
- mousemove handler does ONE thing: `mouseRef.current = { x, y }` (no setState)
- A single rAF loop drains the ref to RTDB every ~33ms (30Hz)
- Peer updates write to `peersRef.current[uid]` (no setState per coord)
- React re-renders only when peer count changes (join/leave)
- All visual updates (cursors, particles) via canvas/DOM mutation, never React

## Phase 2 — Physics & Interaction

- `PhysicsEngine` module wrapping Matter.js (gravity, collision, mouseConstraint)
- Shared physics objects (balls, blocks) synced via RTDB at `/playground/physics/{id}`
- Authority model: object's last toucher becomes owner for 2s; only owner writes
  position/velocity. Other clients interpolate. Conflict-free for kid-grade play.
- Tap-to-spawn ball; throw with mouse drag; objects bounce off other players' cursors
- Schema: `/playground/physics/{id} = { x, y, vx, vy, owner, type, ts }`

## Phase 3 — Engagement (gamified feedback + social hooks)

- `LiveReactions` — floating emoji bar; click emoji → broadcasts to all visitors
  via `/playground/reactions/{ts}`, server-trim to last 50, all clients animate float-up
- `Guestbook` — micro-status board, 1 line per visitor at `/playground/guestbook/{uid}`
- `BadgeSystem` — extends existing kids.html XP system with shared badge unlocks
  (some badges visible only when N peers are online together)
- Click-to-celebrate: clicking another peer's cursor sends them a particle burst

## Phase 4 — Audio & Theming (procedural + global events)

- `AudioOrchestrator` — Web Audio synthesized soundscape; pitch responds to peer count,
  cursor velocity adds shimmer, click emits chime tied to user's hue
- `ThemeBus` — global event channel at `/playground/state/theme`; one shared button
  rotates theme for all connected users instantly
- `ScrollyTeller` — Intersection Observer based scrolly sections so a single page
  unfolds as a story rather than a static dump

## Out of scope (Phase 1)

- Auth above Anonymous (no email, no display name capture)
- Persistence beyond `localStorage` for personal prefs
- Server-authoritative game logic (Firebase RTDB is the source of truth)
- Mobile-only gestures beyond touch-as-mouse
