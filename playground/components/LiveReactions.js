// playground/components/LiveReactions.js
// Phase 2-lite: floating emoji reactions everyone sees in real time.
// - Bottom emoji palette: tap an emoji → broadcasts to RTDB at /playground/reactions/{ts}
// - All connected players see the emoji float up from the local cursor position
// - 50-message ring buffer; client garbage-collects entries older than 6s
// - Same useRef-heavy contract as cursor sync — emojis animate via canvas, not React

import { useFirebase } from '../hooks/useFirebase.js';
import { PATHS } from '../core/config.js';
import {
  ref, push, query, limitToLast, onChildAdded, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';

const { useEffect, useRef, useState } = window.React;
const h = window.React.createElement;

const PALETTE = ['🔥','💜','😂','🚀','⭐','🎮','🎉','💥','👾','🦄','💯','🤘'];

export function LiveReactions({ mouseRef, identity }) {
  const { db, user } = useFirebase();
  const canvasRef   = useRef(null);
  const reactionsRef= useRef([]);          // active animated emojis on screen
  const [hoverIdx, setHoverIdx] = useState(-1);

  // Resize canvas to viewport.
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      c.width  = Math.floor(window.innerWidth  * dpr);
      c.height = Math.floor(window.innerHeight * dpr);
      c.style.width  = window.innerWidth  + 'px';
      c.style.height = window.innerHeight + 'px';
      const ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Subscribe to RTDB reactions stream — every connected client sees the same emoji bursts.
  useEffect(() => {
    if (!db || !user) return;
    const node = ref(db, PATHS.reactions);
    const q    = query(node, limitToLast(50));
    const t0   = Date.now();
    const unsub = onChildAdded(q, (snap) => {
      const v = snap.val(); if (!v) return;
      // Skip messages from before we joined to avoid a flood on first load.
      if (v.ts && v.ts < t0 - 4000) return;
      reactionsRef.current.push({
        emoji: v.emoji || '⭐',
        x:     typeof v.x === 'number' ? v.x : window.innerWidth / 2,
        y:     typeof v.y === 'number' ? v.y : window.innerHeight - 100,
        hue:   typeof v.hue === 'number' ? v.hue : 200,
        born:  performance.now(),
        vy:    -1.4 + Math.random() * -0.8,
        vx:    (Math.random() - 0.5) * 0.6,
        rot:   (Math.random() - 0.5) * 0.4,
      });
      if (reactionsRef.current.length > 80) reactionsRef.current.shift();
    });
    return () => { try { unsub(); } catch (_) {} };
  }, [db, user]);

  // Render loop — pure canvas + rAF, zero React re-render per frame.
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d');
    let raf = 0;
    function frame(t) {
      ctx.clearRect(0, 0, c.width, c.height);
      const arr = reactionsRef.current;
      for (let i = arr.length - 1; i >= 0; i--) {
        const r = arr[i];
        const age = t - r.born;
        if (age > 4000) { arr.splice(i, 1); continue; }
        r.x += r.vx * 1;
        r.y += r.vy * 1;
        r.vy *= 0.998;             // slight drift
        const alpha = age < 200 ? age / 200 : Math.max(0, 1 - (age - 200) / 3800);
        const scale = 1 + Math.min(1, age / 600) * 0.6;
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.rotate(r.rot * (age / 1000));
        ctx.globalAlpha = alpha;
        ctx.font = `${36 * scale}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",emoji,sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(r.emoji, 0, 0);
        ctx.restore();
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Send a reaction — uses local mouse position so the emoji floats from where you are.
  function send(emoji) {
    if (!db || !user) return;
    const m = mouseRef && mouseRef.current ? mouseRef.current : { x: window.innerWidth/2, y: window.innerHeight - 80 };
    const node = ref(db, PATHS.reactions);
    push(node, {
      uid:   user.uid,
      emoji,
      x:     m.x, y: m.y,
      hue:   identity?.hue || 200,
      ts:    Date.now(),
      sts:   serverTimestamp(),
    }).catch(() => {});
  }

  // Click a peer cursor to send them a particle blast.
  // Fires when the local user clicks anywhere — tries to find the closest peer cursor.
  // (Keeping it fully ref-driven so clicks anywhere on screen produce a reaction at that point.)
  useEffect(() => {
    function onClick(e) {
      // Skip clicks on actual interactive elements (palette buttons, links).
      if (e.target && e.target.closest && e.target.closest('.lr-btn')) return;
      send('💥');
    }
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, []);

  // <canvas /> + <div class="lr-palette" />
  return h('div', null,
    h('canvas', {
      ref: canvasRef, className: 'live-reactions-canvas',
      style: { position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9994 },
    }),
    h('div', { className: 'lr-palette', style: paletteStyle },
      ...PALETTE.map((emoji, i) => h('button', {
        key: emoji, className: 'lr-btn',
        onClick: () => send(emoji),
        onMouseEnter: () => setHoverIdx(i),
        onMouseLeave: () => setHoverIdx(-1),
        style: btnStyle(i === hoverIdx),
      }, emoji)),
    ),
  );
}

const paletteStyle = {
  position: 'fixed', bottom: 14, left: '50%', transform: 'translateX(-50%)',
  display: 'flex', gap: 6, padding: '8px 14px',
  background: 'rgba(0, 0, 0, 0.7)',
  border: '1px solid rgba(168, 85, 247, .5)', borderRadius: 99,
  backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
  zIndex: 9999, boxShadow: '0 6px 24px rgba(0,0,0,.5), 0 0 18px rgba(168,85,247,.25)',
  pointerEvents: 'auto',
};
function btnStyle(hover) {
  return {
    background: hover ? 'rgba(168, 85, 247, .25)' : 'transparent',
    border: 0, borderRadius: 99, padding: '4px 8px',
    fontSize: 22, cursor: 'pointer', lineHeight: 1,
    fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",emoji,sans-serif',
    transform: hover ? 'translateY(-3px) scale(1.15)' : 'none',
    transition: 'transform .12s, background .12s',
  };
}
