// playground/components/PresenceManager.js
// Renders a colored circle + name label for every other connected visitor.
// Re-renders ONLY on join/leave. Position updates happen via direct DOM
// transform mutation in a rAF loop reading from peersRef.current.

import { usePresence } from '../hooks/usePresence.js';
import { usePresencePeers } from '../hooks/usePresencePeers.js';
import { PRESENCE_STALE_MS, PALETTE } from '../core/config.js';

const { useEffect, useRef } = window.React;
const h = window.React.createElement;

export function PresenceManager({ showSelfHalo = true, showLabels = true }) {
  // Drive local cursor sync as a side-effect of mounting.
  const { mouseRef, identity } = usePresence();
  const { peersRef, peerCount } = usePresencePeers();

  // DOM node pool: one div per peer uid. Created on first sight, reused after.
  const containerRef = useRef(null);
  const nodeMapRef   = useRef(new Map());

  // The render loop — pure DOM mutation, never React state.
  useEffect(() => {
    let raf = 0;
    function tick() {
      const container = containerRef.current;
      if (!container) { raf = requestAnimationFrame(tick); return; }
      const peers = peersRef.current;
      const seen = new Set();
      const now = Date.now();

      for (const uid of Object.keys(peers)) {
        const p = peers[uid]; if (!p) continue;
        seen.add(uid);
        let node = nodeMapRef.current.get(uid);
        if (!node) {
          node = makeCursorNode(p);
          nodeMapRef.current.set(uid, node);
          container.appendChild(node);
        }
        // Stale fade — peers who haven't ticked in a while go transparent
        const age   = Math.max(0, now - (p.ts || now));
        const alpha = age > PRESENCE_STALE_MS ? 0 : 1 - Math.min(1, age / PRESENCE_STALE_MS);
        node.style.opacity = String(alpha);
        node.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
        if (showLabels) {
          const label = node.firstElementChild.nextElementSibling;
          if (label) label.textContent = p.name || 'guest';
        }
      }
      // Garbage-collect cursor nodes for peers who left.
      for (const [uid, node] of nodeMapRef.current.entries()) {
        if (!seen.has(uid)) {
          node.remove();
          nodeMapRef.current.delete(uid);
        }
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [peersRef, showLabels]);

  // Self halo — a soft glow where the local cursor is. Optional.
  const selfHaloRef = useRef(null);
  useEffect(() => {
    if (!showSelfHalo) return;
    let raf = 0;
    function tick() {
      const halo = selfHaloRef.current;
      if (halo && identity) {
        const m = mouseRef.current;
        halo.style.transform = `translate3d(${m.x}px, ${m.y}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [identity, mouseRef, showSelfHalo]);

  // <div className="playground-cursors" ref={containerRef}>
  //   {showSelfHalo && <div className="self-halo" style={{...}} />}
  //   <PeerCount n={peerCount} />
  // </div>
  return h('div', {
      ref: containerRef,
      className: 'playground-cursors',
      style: cursorContainerStyle,
    },
    showSelfHalo && identity && h('div', {
      key: 'halo',
      ref: selfHaloRef,
      style: selfHaloStyle(identity.hue),
    }),
    h(PeerCountBadge, { key: 'count', n: peerCount, selfName: identity && identity.name, selfHue: identity && identity.hue }),
  );
}

// ---------------- helpers ----------------

function makeCursorNode(p) {
  const wrap = document.createElement('div');
  wrap.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'pointer-events:none',
    'z-index:9998', 'will-change:transform,opacity',
    'transition:opacity .25s ease-out', 'transform:translate3d(-9999px,-9999px,0)',
  ].join(';');

  const dot = document.createElement('div');
  dot.style.cssText = [
    'width:18px','height:18px','border-radius:50%',
    `background:hsl(${p.hue} ${PALETTE.saturation}% ${PALETTE.lightness}%)`,
    `box-shadow:0 0 16px hsl(${p.hue} ${PALETTE.saturation}% ${PALETTE.lightness}% / .8)`,
    'border:2px solid #fff',
  ].join(';');
  wrap.appendChild(dot);

  const label = document.createElement('div');
  label.style.cssText = [
    'margin-left:22px','margin-top:-6px','padding:2px 8px',
    'background:rgba(0,0,0,.7)','color:#fff','border-radius:99px',
    'font:700 11px "Comic Sans MS","Trebuchet MS",sans-serif',
    'white-space:nowrap',
    `border:1px solid hsl(${p.hue} ${PALETTE.saturation}% ${PALETTE.lightness}% / .6)`,
  ].join(';');
  label.textContent = p.name || 'guest';
  wrap.appendChild(label);
  return wrap;
}

function PeerCountBadge({ n, selfName, selfHue }) {
  // Tiny static HUD — re-renders only when n changes.
  return h('div', { style: peerBadgeStyle }, [
    h('span', { key: 'd', style: { color: `hsl(${selfHue || 200} 90% 65%)`, fontWeight: 800 } }, '●'),
    ' ', h('span', { key: 's' }, selfName || 'you'),
    h('span', { key: 'g', style: { opacity: .6, margin: '0 6px' } }, '·'),
    h('span', { key: 'c' }, n === 0 ? 'flying solo' : `${n} other${n === 1 ? '' : 's'} online`),
  ]);
}

const cursorContainerStyle = {
  position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9997,
};
function selfHaloStyle(hue) {
  return {
    position: 'fixed', top: 0, left: 0, pointerEvents: 'none',
    width: '120px', height: '120px', borderRadius: '50%',
    background: `radial-gradient(circle, hsl(${hue} 90% 62% / .25) 0%, transparent 70%)`,
    transform: 'translate3d(-9999px,-9999px,0)',
    marginLeft: '-60px', marginTop: '-60px',
    willChange: 'transform', zIndex: 9996,
  };
}
const peerBadgeStyle = {
  position: 'fixed', bottom: 14, left: 14, padding: '6px 14px',
  background: 'rgba(0,0,0,.7)', color: '#fff', borderRadius: 99,
  font: '700 12px "Comic Sans MS","Trebuchet MS",sans-serif',
  zIndex: 9999, pointerEvents: 'none',
  border: '1px solid rgba(255,255,255,.18)',
};
