// playground/hooks/useFirebase.js
// Convenience hook to consume PlaygroundContext without a stale-import dance.

import { PlaygroundContext } from '../core/PlaygroundProvider.js';
const { useContext } = window.React;

export function useFirebase() {
  const ctx = useContext(PlaygroundContext);
  if (!ctx) throw new Error('useFirebase must be used inside <PlaygroundProvider>');
  return ctx;  // { app, auth, db, user, ready }
}
