// playground/hooks/usePresence.js
// Local user → Firebase. Mousemove writes go into a ref (zero re-renders).
// A single rAF-throttled loop drains the ref into RTDB at 30Hz.
// onDisconnect().remove() guarantees the cursor disappears when the tab closes.

import { ref, set, update, onDisconnect, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { useFirebase } from './useFirebase.js';
import { useThrottledRAF } from './useThrottledFn.js';
import { PATHS, PRESENCE_WRITE_MS } from '../core/config.js';
import { hueFromUid, nameFromUid } from '../utils/rng.js';

const { useEffect, useRef } = window.React;

/**
 * usePresence — wires the local cursor + identity to RTDB.
 * Returns { mouseRef } so siblings (e.g. ParticleField) can read the same
 * source without a second event listener.
 *
 * Performance contract:
 *   - mousemove handler does ONE thing: write x/y to mouseRef.current
 *   - rAF loop reads mouseRef and emits at most one RTDB write per PRESENCE_WRITE_MS
 *   - This hook NEVER calls setState during normal interaction
 */
export function usePresence() {
  const { db, user } = useFirebase();
  const mouseRef = useRef({ x: -9999, y: -9999, t: 0, dirty: false });
  const identityRef = useRef(null);

  // Build a stable identity (hue + name) once we know the uid.
  // Prefer the shared profile from window.AYDEN_ID (if loaded) so the cursor
  // shows the user's chosen display name across kids.html / playground / index.html.
  if (user && !identityRef.current) {
    const shared = (window.AYDEN_ID && window.AYDEN_ID.profile) || null;
    identityRef.current = {
      uid:  user.uid,
      hue:  shared?.hue  ?? hueFromUid(user.uid),
      name: shared?.displayName ?? nameFromUid(user.uid),
    };
  }

  // Listen for local mouse + touch movement. Pure ref writes; no React state.
  useEffect(() => {
    function onMove(e) {
      const m = mouseRef.current;
      if (e.touches && e.touches[0]) {
        m.x = e.touches[0].clientX;
        m.y = e.touches[0].clientY;
      } else {
        m.x = e.clientX;
        m.y = e.clientY;
      }
      m.t = performance.now();
      m.dirty = true;
    }
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchstart', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchstart', onMove);
    };
  }, []);

  // Set up the presence node + onDisconnect cleanup once we have a uid.
  useEffect(() => {
    if (!user || !db) return;
    const id = identityRef.current;
    const node = ref(db, `${PATHS.presence}/${id.uid}`);

    // Initial write so the cursor exists even before first mousemove.
    set(node, {
      x: -9999, y: -9999, hue: id.hue, name: id.name, ts: serverTimestamp(),
    }).catch((e) => console.warn('[usePresence] initial set failed:', e.message));

    // Tear down when the tab closes / loses connection.
    onDisconnect(node).remove();

    return () => {
      // Best-effort proactive remove (covers in-page navigation).
      // RTDB still removes via onDisconnect on real disconnect.
      try { set(node, null); } catch (_) {}
    };
  }, [db, user]);

  // 30Hz RTDB sync — the ONE thing this hook does at high frequency.
  useThrottledRAF(() => {
    if (!user || !db) return;
    const m = mouseRef.current;
    if (!m.dirty) return;            // skip the round-trip if nothing changed
    m.dirty = false;
    const id = identityRef.current;
    const node = ref(db, `${PATHS.presence}/${id.uid}`);
    update(node, { x: m.x, y: m.y, ts: serverTimestamp() })
      .catch((e) => { /* swallow transient writes during reconnect */ });
  }, PRESENCE_WRITE_MS);

  return { mouseRef, identity: identityRef.current };
}
