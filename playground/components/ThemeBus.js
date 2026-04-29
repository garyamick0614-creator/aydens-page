// playground/components/ThemeBus.js
// Phase 4: Global event bus. Anyone clicks a theme button → /playground/state/theme
// in RTDB updates → every connected client's CSS theme rotates instantly.
// Pure useRef-driven; React only re-renders the local theme button labels.

import { useFirebase } from '../hooks/useFirebase.js';
import { PATHS } from '../core/config.js';
import {
  ref, set, onValue, off, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';

const { useEffect, useState, useRef } = window.React;
const h = window.React.createElement;

const THEMES = {
  cyber:    { bg1: '#5b21b6',   bg2: '#0e7490',   bg3: '#be185d',   accent: '#a855f7' },
  neon:     { bg1: '#00f0ff',   bg2: '#ff2bd6',   bg3: '#39ff14',   accent: '#00f0ff' },
  sunset:   { bg1: '#ff7a00',   bg2: '#ff2bd6',   bg3: '#7c2d12',   accent: '#fb923c' },
  forest:   { bg1: '#065f46',   bg2: '#0e7490',   bg3: '#1e3a8a',   accent: '#10b981' },
  arcade:   { bg1: '#9333ea',   bg2: '#facc15',   bg3: '#f43f5e',   accent: '#facc15' },
  midnight: { bg1: '#1e3a8a',   bg2: '#312e81',   bg3: '#0f172a',   accent: '#60a5fa' },
};

function applyTheme(t) {
  const def = THEMES[t] || THEMES.cyber;
  document.body.style.background =
    `radial-gradient(circle at 10% -10%, ${def.bg1} 0%, transparent 50%),` +
    `radial-gradient(circle at 90% 10%, ${def.bg2} 0%, transparent 50%),` +
    `radial-gradient(circle at 50% 110%, ${def.bg3} 0%, transparent 60%),` +
    `#0a0e14`;
  document.documentElement.style.setProperty('--accent', def.accent);
}

export function ThemeBus() {
  const { db, user } = useFirebase();
  const [theme, setTheme] = useState('cyber');
  const lastByRef = useRef('');

  // Subscribe to /playground/state/theme — every client paints together.
  useEffect(() => {
    if (!db) return;
    const node = ref(db, PATHS.themeState);
    const cb = (snap) => {
      const v = snap.val();
      if (!v) return;
      const next = v.themeKey || 'cyber';
      setTheme(next);
      applyTheme(next);
      lastByRef.current = v.by || '';
    };
    onValue(node, cb);
    return () => { try { off(node, 'value', cb); } catch (_) {} };
  }, [db]);

  function pick(themeKey) {
    if (!db || !user) return;
    set(ref(db, PATHS.themeState), {
      themeKey, ts: serverTimestamp(), by: user.uid,
    }).catch(() => {});
  }

  return h('div', { style: paletteStyle },
    h('span', { style: labelStyle }, '◉ THEME'),
    ...Object.keys(THEMES).map(k => h('button', {
      key: k, onClick: () => pick(k),
      style: pillStyle(k === theme, THEMES[k].accent),
      title: `Set theme to ${k} for everyone`,
    }, k.toUpperCase())),
  );
}

const paletteStyle = {
  position: 'fixed', top: 14, left: 14, padding: '6px 10px',
  background: 'rgba(0,0,0,.75)', border: '1px solid rgba(168,85,247,.45)',
  borderRadius: 99, display: 'flex', gap: 4, alignItems: 'center',
  backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
  zIndex: 9999, pointerEvents: 'auto',
  font: '700 10px "Russo One", system-ui, sans-serif', letterSpacing: '.12em', textTransform: 'uppercase',
};
const labelStyle = { color: '#a855f7', marginRight: 4, fontWeight: 800 };
function pillStyle(active, accent) {
  return {
    background: active ? accent : 'transparent',
    color: active ? '#000' : '#fff',
    border: `1px solid ${accent}`, borderRadius: 99,
    padding: '4px 8px', cursor: 'pointer',
    font: '700 9px "Russo One", system-ui, sans-serif', letterSpacing: '.1em',
    transition: 'all .12s',
  };
}
