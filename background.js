/* Animated neon particle field. Real canvas, no library. */
(() => {
  const cv = document.getElementById('bgcanvas');
  if (!cv) return;
  const ctx = cv.getContext('2d', { alpha: true });
  if (!ctx) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0, h = 0;
  let particles = [];
  let mouseX = -9999, mouseY = -9999;
  let raf = 0;
  let running = true;

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    cv.width  = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    cv.style.width  = w + 'px';
    cv.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function readAccent() {
    const cs = getComputedStyle(document.body);
    const a = cs.getPropertyValue('--accent').trim() || '#b400ff';
    const a2 = cs.getPropertyValue('--accent-2').trim() || '#00f0ff';
    return [a, a2];
  }

  function seed() {
    const target = Math.floor((w * h) / 22000);
    const count = Math.max(40, Math.min(140, target));
    particles = new Array(count).fill(0).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.6 + 0.4,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      a: Math.random() * 0.6 + 0.2,
      hue: Math.random() < 0.5 ? 0 : 1
    }));
  }

  function step() {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);
    const [c1, c2] = readAccent();

    // soft glow blobs that drift
    const t = performance.now() / 1000;
    const blob = (cx, cy, rad, color) => {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, color + '55');
      g.addColorStop(1, color + '00');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
    };
    blob(w * 0.2 + Math.sin(t * 0.4) * 60, h * 0.3 + Math.cos(t * 0.35) * 40, 220, c1);
    blob(w * 0.8 + Math.cos(t * 0.3) * 50, h * 0.7 + Math.sin(t * 0.45) * 50, 240, c2);

    // particles + connections
    ctx.lineCap = 'round';
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      // wrap
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10;
      if (p.y > h + 10) p.y = -10;

      // mouse repel
      const dx = p.x - mouseX, dy = p.y - mouseY;
      const dd = dx * dx + dy * dy;
      if (dd < 12000) {
        const force = (1 - dd / 12000) * 0.6;
        p.vx += (dx / Math.sqrt(dd)) * force * 0.05;
        p.vy += (dy / Math.sqrt(dd)) * force * 0.05;
      }
      // damp
      p.vx *= 0.985; p.vy *= 0.985;

      const color = p.hue ? c1 : c2;
      ctx.fillStyle = color;
      ctx.globalAlpha = p.a;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // connect near neighbors (cheap O(N^2) for small N)
      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const ax = p.x - q.x, ay = p.y - q.y;
        const ad2 = ax * ax + ay * ay;
        if (ad2 < 9000) {
          const o = 1 - ad2 / 9000;
          ctx.strokeStyle = color;
          ctx.globalAlpha = o * 0.18;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }

    raf = requestAnimationFrame(step);
  }

  function pause() { running = false; cancelAnimationFrame(raf); }
  function resume() { if (running) return; running = true; step(); }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause(); else resume();
  });

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; }, { passive: true });
  window.addEventListener('mouseleave', () => { mouseX = -9999; mouseY = -9999; });
  window.addEventListener('touchmove', e => {
    if (e.touches[0]) { mouseX = e.touches[0].clientX; mouseY = e.touches[0].clientY; }
  }, { passive: true });

  // expose toggle
  window.AydenBG = {
    pause, resume,
    setEnabled(on) {
      if (on) { document.body.classList.remove('no-bg'); resume(); }
      else    { document.body.classList.add('no-bg');    pause(); }
    }
  };

  resize();
  step();
})();
