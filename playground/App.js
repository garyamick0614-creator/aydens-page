// playground/App.js
// Top-level composition for Phase 1.
// PlaygroundProvider establishes Firebase + Anonymous Auth, then renders
// PresenceManager (peer cursors) + ParticleField (mouse trail).
//
// Both consumers share the same mouseRef + identity from the usePresence hook
// — we lift it once at App level so we don't run two mousemove listeners or
// two RTDB write loops.

import { PlaygroundProvider } from './core/PlaygroundProvider.js';
import { usePresence } from './hooks/usePresence.js';
import { PresenceManager } from './components/PresenceManager.js';
import { ParticleField } from './components/ParticleField.js';
import { LiveReactions } from './components/LiveReactions.js';
import { ThemeBus } from './components/ThemeBus.js';
import { AudioOrchestrator } from './components/AudioOrchestrator.js';
import { ScrollyTeller } from './components/ScrollyTeller.js';

const h = window.React.createElement;

function PlaygroundContent() {
  // Single source of truth for local mouse + identity. Children read the same ref.
  const { mouseRef, identity } = usePresence();
  return h('div', { className: 'playground-root' },
    h('a', { id: 'top' }),
    h(ParticleField,      { mouseRef, identity }),
    h(PresenceManager,    { showSelfHalo: true, showLabels: true }),
    h(LiveReactions,      { mouseRef, identity }),  // Phase 2-lite: shared emoji bursts
    h(ThemeBus,           null),                     // Phase 4: shared theme bus
    h(AudioOrchestrator,  { mouseRef, identity }),  // Phase 3: procedural soundscape
    h(WelcomeOverlay,     { identity }),
    h(ScrollyTeller,      null),                     // Phase 4: scroll-tell story below the fold
  );
}

function WelcomeOverlay({ identity }) {
  if (!identity) return null;
  return h('div', { style: welcomeStyle },
    h('div', { style: { fontSize: 24, fontWeight: 900 } }, '👋 Welcome to the Playground'),
    h('div', { style: { color: '#cbd5e1', marginTop: 6 } }, [
      'You are ',
      h('span', { key: 'n', style: { color: `hsl(${identity.hue} 90% 65%)`, fontWeight: 800 } }, identity.name),
      '. Move your mouse — your cursor is being shared with everyone else here.',
    ]),
    h('div', { style: { fontSize: 12, color: '#64748b', marginTop: 8 } },
      'Phase 1 of the PlaygroundArchitect. Physics, audio, and reactions land in Phase 2-4.'),
    h('a', { href: '/kids.html', style: linkStyle }, '← back to Ayden\'s Hub'),
  );
}

const welcomeStyle = {
  position: 'fixed', top: 14, left: 14, padding: '14px 18px',
  background: 'rgba(0,0,0,.7)', color: '#fff', borderRadius: 14,
  font: '600 14px "Comic Sans MS","Trebuchet MS",sans-serif',
  border: '2px solid rgba(168,85,247,.4)', maxWidth: 380, zIndex: 9999,
  pointerEvents: 'auto',
  boxShadow: '0 8px 32px rgba(0,0,0,.4)',
};
const linkStyle = {
  display: 'inline-block', marginTop: 10, color: '#fbbf24',
  textDecoration: 'none', fontSize: 13, fontWeight: 700,
};

export function App() {
  return h(PlaygroundProvider, null, h(PlaygroundContent));
}
