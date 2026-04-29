// playground/components/AudioOrchestrator.js
// Phase 3: procedural Web Audio soundscape that responds to playground state.
// - Drone pad: pitch tied to peer count (more friends = brighter chord)
// - Cursor velocity → high-pass shimmer
// - Click anywhere → pluck chime tied to user's hue
// User-gesture gated (browsers refuse to start AudioContext without one).

import { useFirebase } from '../hooks/useFirebase.js';
import { usePresencePeers } from '../hooks/usePresencePeers.js';

const { useEffect, useRef, useState } = window.React;
const h = window.React.createElement;

export function AudioOrchestrator({ mouseRef, identity }) {
  const { user } = useFirebase();
  const { peerCount } = usePresencePeers();
  const ctxRef     = useRef(null);
  const padRef     = useRef(null);   // { osc1, osc2, gain }
  const filterRef  = useRef(null);
  const lastMouse  = useRef({ x: 0, y: 0, t: 0 });
  const [enabled, setEnabled] = useState(false);

  function start() {
    if (ctxRef.current) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = ctx;
      // Master gain — kept low so it's a vibe, not a noise.
      const master = ctx.createGain(); master.gain.value = 0.06; master.connect(ctx.destination);
      // High-pass filter: cursor velocity drives the cutoff.
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 80;
      hp.connect(master); filterRef.current = hp;
      // Two detuned sine drones = pad chord. Frequencies set in updatePad().
      const o1 = ctx.createOscillator(); o1.type = 'sine';
      const o2 = ctx.createOscillator(); o2.type = 'sine';
      const g  = ctx.createGain(); g.gain.value = 0.6;
      o1.connect(g); o2.connect(g); g.connect(hp);
      o1.start(); o2.start();
      padRef.current = { o1, o2, g };
      updatePad(0);
      setEnabled(true);
    } catch (e) { console.warn('[audio]', e); }
  }
  function stop() {
    const ctx = ctxRef.current;
    if (!ctx) return;
    try { padRef.current.o1.stop(); padRef.current.o2.stop(); } catch (_) {}
    try { ctx.close(); } catch (_) {}
    ctxRef.current = null; padRef.current = null; filterRef.current = null;
    setEnabled(false);
  }

  // Pad pitch reflects peer count: 0 peers = root, +1 = +5th, +2 = +octave, etc.
  function updatePad(peers) {
    if (!padRef.current) return;
    const ROOT = 110;       // A2
    const intervals = [1, 1.5, 2, 2.25, 3, 3.75, 4, 5];   // unison/5th/oct/+...
    const pitch = ROOT * (intervals[Math.min(peers, intervals.length - 1)] || 1);
    padRef.current.o1.frequency.setTargetAtTime(pitch, ctxRef.current.currentTime, 0.5);
    padRef.current.o2.frequency.setTargetAtTime(pitch * 1.5, ctxRef.current.currentTime, 0.5);
  }

  useEffect(() => { if (enabled) updatePad(peerCount); }, [peerCount, enabled]);

  // rAF loop reads mouseRef velocity → maps to filter cutoff. No React state.
  useEffect(() => {
    if (!enabled || !mouseRef) return;
    let raf = 0;
    function tick() {
      const m = mouseRef.current; const lm = lastMouse.current;
      const now = performance.now();
      const dx = m.x - lm.x, dy = m.y - lm.y;
      const dt = Math.max(1, now - lm.t);
      const speed = Math.hypot(dx, dy) / dt;            // px/ms
      lm.x = m.x; lm.y = m.y; lm.t = now;
      if (filterRef.current) {
        const cutoff = 80 + Math.min(8000, speed * 1500);
        filterRef.current.frequency.setTargetAtTime(cutoff, ctxRef.current.currentTime, 0.05);
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled, mouseRef]);

  // Click → pluck chime tuned to identity hue (hue/360 → octave bend).
  useEffect(() => {
    if (!enabled) return;
    function onClick() {
      const ctx = ctxRef.current; if (!ctx) return;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      const hue = (identity && identity.hue) || 200;
      const freq = 220 * Math.pow(2, (hue / 360) * 1.5);  // 220-622 Hz range
      o.type = 'triangle'; o.frequency.value = freq;
      g.gain.value = 0.18;
      g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      o.connect(g); g.connect(filterRef.current || ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.5);
    }
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, [enabled, identity]);

  return h('button', {
    onClick: enabled ? stop : start,
    style: btnStyle(enabled),
    title: enabled ? 'Audio on — click to mute' : 'Click to enable procedural soundscape (browser requires a tap to start audio)',
  }, enabled ? '🔊 AUDIO ON' : '🔇 AUDIO OFF');
}

function btnStyle(on) {
  return {
    position: 'fixed', top: 14, right: 14, padding: '6px 14px',
    background: on ? 'rgba(57,255,20,.18)' : 'rgba(0,0,0,.7)',
    color: on ? '#39ff14' : '#9aa3c4',
    border: `1px solid ${on ? '#39ff14' : 'rgba(255,255,255,.18)'}`,
    borderRadius: 99, cursor: 'pointer',
    font: '700 10px "Russo One", system-ui, sans-serif', letterSpacing: '.14em',
    backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
    zIndex: 9999, pointerEvents: 'auto',
    boxShadow: on ? '0 0 14px rgba(57,255,20,.5)' : 'none',
  };
}
