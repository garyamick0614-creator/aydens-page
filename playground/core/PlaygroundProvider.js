// playground/core/PlaygroundProvider.js
// Initializes Firebase + Anonymous Auth and exposes { app, auth, db, user, ready }
// via React context. Renders nothing while signing in (so child components can
// rely on `user.uid` being non-null).

import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';

const { createContext, useContext, useEffect, useMemo, useState } = window.React;
const h = window.React.createElement;

// One global Firebase app per page-load. Reuse if main aydens-page script.js
// already initialized it (rare here since playground.html is its own entry).
function ensureApp(cfg) {
  const existing = getApps().find(a => a.options && a.options.projectId === cfg.projectId);
  return existing || initializeApp(cfg);
}

export const PlaygroundContext = createContext(null);

export function PlaygroundProvider({ children, fallback }) {
  const cfg = window.AYDEN_FIREBASE_CONFIG;
  if (!cfg) {
    return h('div', { style: { padding: 20, color: '#f87171', font: '600 14px sans-serif' } },
      'Firebase config not found. Make sure firebase-config.js loaded before playground/main.js.');
  }

  const app  = useMemo(() => ensureApp(cfg), []);
  const auth = useMemo(() => getAuth(app), [app]);
  const db   = useMemo(() => getDatabase(app), [app]);

  const [user, setUser]   = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unsub = null;
    (async () => {
      try {
        if (!auth.currentUser) await signInAnonymously(auth);
        unsub = onAuthStateChanged(auth, (u) => {
          if (u) {
            setUser(u);
            setReady(true);
          } else {
            // Race: auth state cleared. Try to re-sign in anonymously.
            signInAnonymously(auth).catch((e) => setError(e.message));
          }
        });
      } catch (e) {
        setError(e.message);
      }
    })();
    return () => { if (unsub) unsub(); };
  }, [auth]);

  // Hook-rules fix: useMemo MUST be called every render in the same order.
  // Previously this was below conditional returns → React #310 on production builds.
  const value = useMemo(() => ({ app, auth, db, user, ready }), [app, auth, db, user, ready]);

  if (error) {
    return h('div', {
      style: {
        padding: 20, margin: 20, borderRadius: 12,
        background: 'rgba(248,113,113,.1)', border: '2px solid #f87171',
        color: '#f87171', font: '600 14px sans-serif',
      },
    }, [
      h('div', { key: 't', style: { fontWeight: 800, marginBottom: 6 } }, '⚠ Sign-in failed'),
      h('div', { key: 'm' }, error),
      h('div', { key: 'h', style: { marginTop: 10, fontSize: 12, color: '#cbd5e1' } },
        'Enable Anonymous Auth in the Firebase console: Authentication → Sign-in method → Anonymous → Enable.'),
    ]);
  }

  if (!ready) return fallback || h('div', {
    style: { padding: 40, textAlign: 'center', color: '#cbd5e1', font: '600 14px sans-serif' },
  }, 'Connecting to playground…');

  return h(PlaygroundContext.Provider, { value }, children);
}
