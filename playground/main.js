// playground/main.js
// Mount entry. Loaded by playground.html as <script type="module">.
// Assumes window.React + window.ReactDOM are already on the page (UMD CDN
// scripts loaded synchronously before this module).

import { App } from './App.js';

const root = document.getElementById('playground-root');
if (!root) {
  console.error('[playground] missing <div id="playground-root"> in DOM');
} else if (!window.React || !window.ReactDOM) {
  root.innerHTML = '<div style="padding:40px;color:#f87171;font:600 14px sans-serif">' +
    'React UMD scripts failed to load. Check network / CSP. Expected ' +
    '<code>window.React</code> + <code>window.ReactDOM</code>.</div>';
} else if (!window.AYDEN_FIREBASE_CONFIG) {
  root.innerHTML = '<div style="padding:40px;color:#f87171;font:600 14px sans-serif">' +
    'firebase-config.js missing. Make sure it loads before this module.</div>';
} else {
  const r = window.ReactDOM.createRoot(root);
  r.render(window.React.createElement(App));
}
