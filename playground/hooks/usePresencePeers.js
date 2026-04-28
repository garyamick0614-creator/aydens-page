// playground/hooks/usePresencePeers.js
// Subscribe to /playground/presence and expose a peers ref map.
// Renders ZERO times during cursor movement. Only emits a state update when
// peer COUNT changes (someone joined or left), so React stays calm and the
// renderer (PresenceManager) reads positions from the ref every rAF tick.

import { ref, onChildAdded, onChildChanged, onChildRemoved, off } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { useFirebase } from './useFirebase.js';
import { PATHS } from '../core/config.js';

const { useEffect, useRef, useState } = window.React;

/**
 * Returns:
 *   peersRef.current: { [uid]: { x, y, hue, name, ts } }   (read every frame)
 *   peerCount:        number                                (re-renders on join/leave)
 *   selfUid:          string                                (filtered out by callers)
 */
export function usePresencePeers() {
  const { db, user } = useFirebase();
  const peersRef     = useRef(Object.create(null));
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!db || !user) return;
    const node = ref(db, PATHS.presence);
    const selfUid = user.uid;

    const handleAdded = (snap) => {
      const v = snap.val(); if (!v) return;
      if (snap.key === selfUid) return;          // don't render own cursor
      peersRef.current[snap.key] = v;
      setCount(Object.keys(peersRef.current).length);
    };
    const handleChanged = (snap) => {
      const v = snap.val(); if (!v) return;
      if (snap.key === selfUid) return;
      const cur = peersRef.current[snap.key];
      if (cur) {
        // Mutate in place — same object reference, just updated coords.
        // Renderer's rAF loop reads .x / .y directly; no re-render needed.
        cur.x   = v.x;
        cur.y   = v.y;
        cur.ts  = v.ts;
        cur.hue = v.hue;
        cur.name= v.name;
      } else {
        peersRef.current[snap.key] = v;
        setCount(Object.keys(peersRef.current).length);
      }
    };
    const handleRemoved = (snap) => {
      if (peersRef.current[snap.key]) {
        delete peersRef.current[snap.key];
        setCount(Object.keys(peersRef.current).length);
      }
    };

    const u1 = onChildAdded(node,   handleAdded);
    const u2 = onChildChanged(node, handleChanged);
    const u3 = onChildRemoved(node, handleRemoved);

    return () => {
      off(node, 'child_added',   u1);
      off(node, 'child_changed', u2);
      off(node, 'child_removed', u3);
      peersRef.current = Object.create(null);
      setCount(0);
    };
  }, [db, user]);

  return { peersRef, peerCount: count, selfUid: user && user.uid };
}
