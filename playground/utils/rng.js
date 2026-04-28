// playground/utils/rng.js
// Deterministic color + name from a uid. Same uid → same identity across sessions.

import { PALETTE } from '../core/config.js';

// FNV-1a 32-bit hash — cheap, well-distributed, no deps.
export function hashUid(uid) {
  let h = 0x811c9dc5;
  for (let i = 0; i < uid.length; i++) {
    h ^= uid.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

export function hueFromUid(uid) {
  const [lo, hi] = PALETTE.hueRange;
  return lo + (hashUid(uid) % (hi - lo));
}

const ADJECTIVES = [
  'Brave', 'Cosmic', 'Mighty', 'Sneaky', 'Zappy', 'Glowing', 'Speedy',
  'Pixel', 'Lucky', 'Wild', 'Star', 'Funky', 'Stormy', 'Sparkly',
  'Atomic', 'Turbo', 'Mega', 'Ultra', 'Neon', 'Crystal',
];
const NOUNS = [
  'Fox', 'Wolf', 'Tiger', 'Dragon', 'Phoenix', 'Otter', 'Penguin',
  'Falcon', 'Comet', 'Rocket', 'Nova', 'Pixel', 'Wizard', 'Knight',
  'Robot', 'Astronaut', 'Pilot', 'Ranger', 'Ninja', 'Captain',
];

export function nameFromUid(uid) {
  const h = hashUid(uid);
  const adj  = ADJECTIVES[h % ADJECTIVES.length];
  const noun = NOUNS[(h >>> 8) % NOUNS.length];
  const num  = (h >>> 16) % 100;
  return `${adj}${noun}${num}`;
}

// Fast random in [a,b) — used by particle spawn, never for crypto.
export function rand(a, b) { return a + Math.random() * (b - a); }
