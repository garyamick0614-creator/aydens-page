// playground/core/config.js
// Shared constants. Bump CACHE_BUST when modules change behavior; helps friend's
// stale tabs pick up the new contract on next interaction.

export const CACHE_BUST = '2026-04-28-phase1';

// Firebase RTDB paths. Namespaced under /playground so we don't collide with
// the existing aydens-page /users, /posts, /blocked nodes (kid-portal stuff).
export const PATHS = {
  presence: 'playground/presence',
  physics:  'playground/physics',          // Phase 2
  reactions:'playground/reactions',        // Phase 3
  guestbook:'playground/guestbook',        // Phase 3
  themeState:'playground/state/theme',     // Phase 4
};

// Cursor write throttle. 30 Hz keeps motion fluid while staying under
// Firebase's free-tier write quota even with a few friends online.
export const PRESENCE_WRITE_HZ = 30;
export const PRESENCE_WRITE_MS = Math.round(1000 / PRESENCE_WRITE_HZ);

// Presence considered stale after this many ms with no update. Renderer fades
// the cursor out before this threshold so peers feel "alive" or "gone".
export const PRESENCE_STALE_MS = 4000;

// Particle field tuning.
export const PARTICLES = {
  maxCount:        220,
  spawnPerMove:    2,
  fadeRatePerMs:   0.0015,
  velocityScale:   0.45,
  size:            6,
  blendMode:       'screen',  // pops on dark background
};

// Color palette anchors used by rng.js to derive a hue per uid.
export const PALETTE = {
  hueRange:   [0, 360],
  saturation: 90,
  lightness:  62,
};

// Reserved "self" cursor color hue if we want to override rng for the local user.
export const SELF_HUE = null;
