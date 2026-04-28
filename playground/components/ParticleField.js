// playground/components/ParticleField.js
// Mouse-trail particle system. Pure canvas, pure useRef. NEVER causes a React
// re-render. Runs its own rAF loop. Reads mouse coordinates from the same ref
// that usePresence writes to (passed in via prop).

import { PARTICLES, PALETTE } from '../core/config.js';
import { rand } from '../utils/rng.js';

const { useEffect, useRef } = window.React;
const h = window.React.createElement;

export function ParticleField({ mouseRef, identity }) {
  const canvasRef    = useRef(null);
  const particlesRef = useRef([]);          // reused buffer; never re-allocated
  const lastMouseRef = useRef({ x: -9999, y: -9999 });

  // Resize handling — keep canvas pixel-snapped to the viewport.
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

  // Main render loop. Spawns particles when the cursor moves; advances + paints
  // existing ones every frame; recycles when faded.
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d');
    let raf = 0; let lastT = performance.now();

    const baseHue = (identity && identity.hue) || 200;

    function spawn(x, y, vx, vy) {
      const arr = particlesRef.current;
      // If we're at the cap, recycle oldest.
      if (arr.length >= PARTICLES.maxCount) arr.shift();
      arr.push({
        x, y,
        vx: vx * PARTICLES.velocityScale + rand(-0.4, 0.4),
        vy: vy * PARTICLES.velocityScale + rand(-0.4, 0.4) - 0.2,
        a:  1,
        h:  baseHue + rand(-25, 25),
        s:  PARTICLES.size * (0.7 + Math.random() * 0.7),
      });
    }

    function frame(t) {
      const dt = Math.min(64, t - lastT);
      lastT = t;

      // Spawn from local mouse if it moved enough since last frame.
      const m = mouseRef && mouseRef.current;
      if (m && m.x > -9000) {
        const lm = lastMouseRef.current;
        const dx = m.x - lm.x, dy = m.y - lm.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 1.5 && lm.x > -9000) {
          for (let i = 0; i < PARTICLES.spawnPerMove; i++) spawn(m.x, m.y, dx * 0.05, dy * 0.05);
        }
        lm.x = m.x; lm.y = m.y;
      }

      // Soft fade trail rather than hard clear — gives a smooth ghost.
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(0, 0, c.width, c.height);

      // Additive blend for the particles themselves.
      ctx.globalCompositeOperation = PARTICLES.blendMode;
      const arr = particlesRef.current;
      for (let i = arr.length - 1; i >= 0; i--) {
        const p = arr[i];
        p.x += p.vx * (dt / 16);
        p.y += p.vy * (dt / 16);
        p.vy += 0.04;                                  // gentle gravity
        p.a  -= PARTICLES.fadeRatePerMs * dt;
        if (p.a <= 0) { arr.splice(i, 1); continue; }
        ctx.fillStyle = `hsla(${p.h}, ${PALETTE.saturation}%, ${PALETTE.lightness}%, ${p.a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [mouseRef, identity]);

  // <canvas ref={canvasRef} className="particle-field" />
  return h('canvas', {
    ref: canvasRef,
    className: 'particle-field',
    style: {
      position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9995,
    },
  });
}
