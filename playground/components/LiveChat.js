// playground/components/LiveChat.js
// Phase 2 of the playground roadmap — in-playground chat panel.
// Different from the global floating chat widget (shared/chat-widget.js):
//   - Always-visible side panel (not a toggle bubble) so friends in the same
//     playground room see each other's messages without opening anything
//   - Same /posts/ RTDB feed as the chat widget — messages on either surface
//     appear on both
//   - Color-coded per-sender via the user's hue from shared identity
//
// Performance contract: re-renders only on message-list-shape change. Body
// scroll-pin happens via direct DOM manipulation in a useEffect.

import { useFirebase } from '../hooks/useFirebase.js';
import {
  ref, push, query, limitToLast, onChildAdded, off,
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';

const { useEffect, useRef, useState } = window.React;
const h = window.React.createElement;

const HUE_FALLBACK = 200;

export function LiveChat({ identity, collapsed = false }) {
  const { db, user } = useFirebase();
  const [messages, setMessages] = useState([]);
  const [open, setOpen] = useState(!collapsed);
  const [draft, setDraft] = useState('');
  const feedRef = useRef(null);

  // Subscribe to /posts/* — same channel as the chat-widget so cross-page chat works.
  useEffect(() => {
    if (!db || !user) return;
    const node = ref(db, 'posts');
    const q = query(node, limitToLast(50));
    const t0 = Date.now();
    const cb = (snap) => {
      const v = snap.val();
      if (!v) return;
      // Skip historical replay older than 6 sec to avoid the load-flood badge.
      const isOld = v.at && (t0 - v.at) > 6000;
      setMessages((prev) => {
        // Dedupe — Firebase replays on connect.
        if (prev.some((m) => m.key === snap.key)) return prev;
        const next = [...prev, { key: snap.key, ...v, _historical: isOld }];
        // Keep last 80 in memory.
        return next.length > 80 ? next.slice(-80) : next;
      });
    };
    const unsub = onChildAdded(q, cb);
    return () => { try { off(node, 'child_added', cb); } catch (_) {} };
  }, [db, user]);

  // Auto-scroll to bottom when new messages arrive (but not on initial replay).
  useEffect(() => {
    const el = feedRef.current; if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  function send() {
    const text = (draft || '').trim();
    if (!text || !db || !user) return;
    if (text.length > 240) return;
    const username = (identity && identity.name) || 'guest';
    push(ref(db, 'posts'), {
      username, uid: user.uid, text, at: Date.now(),
      hue: identity?.hue || HUE_FALLBACK,
    }).then(() => setDraft('')).catch(() => {});
  }

  // <button> toggle (collapsed) and <aside> panel (expanded) — both use direct
  // styles so we don't depend on stylesheets the playground.html doesn't load.
  if (!open) {
    return h('button', {
      onClick: () => setOpen(true),
      style: tabStyle, title: 'Open in-playground chat',
    }, '💬 ROOM CHAT', h('span', { style: badgeStyle }, messages.length));
  }

  return h('aside', { style: panelStyle },
    h('header', { style: headerStyle },
      h('span', { style: titleStyle }, '◉ ROOM CHAT'),
      h('span', { style: countStyle }, `${messages.length} msg${messages.length === 1 ? '' : 's'}`),
      h('button', {
        onClick: () => setOpen(false),
        style: closeStyle, title: 'Collapse to tab',
      }, '×'),
    ),
    h('div', { ref: feedRef, style: feedStyle },
      ...messages.map((m) => h('div', {
        key: m.key,
        style: msgStyle(m.hue || HUE_FALLBACK, m.uid === user?.uid),
      },
        h('div', { style: fromStyle(m.hue || HUE_FALLBACK) }, esc(m.username || '?'),
          h('span', { style: whenStyle }, m.at ? new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''),
        ),
        h('div', { style: bodyStyle }, esc(m.text || '')),
      )),
      messages.length === 0 && h('div', { style: emptyStyle }, 'No messages yet — say hi 👋'),
    ),
    h('div', { style: inputRowStyle },
      h('input', {
        type: 'text', value: draft, maxLength: 240,
        placeholder: 'Type a message…',
        onChange: (e) => setDraft(e.target.value),
        onKeyDown: (e) => { if (e.key === 'Enter') send(); },
        style: inputStyle,
      }),
      h('button', { onClick: send, style: sendBtnStyle }, 'SEND'),
    ),
  );
}

function esc(s) { return String(s == null ? '' : s); }

// ------ inline styles (don't depend on stylesheets the playground may not load) ------
const tabStyle = {
  position: 'fixed', right: 14, top: '50%', transform: 'translateY(-50%)',
  background: 'rgba(168,85,247,.18)', color: '#a855f7',
  border: '1px solid #a855f7', borderRadius: 99, padding: '12px 18px',
  font: '700 11px/1 "Russo One", system-ui, sans-serif', letterSpacing: '.14em',
  cursor: 'pointer', boxShadow: '0 0 14px rgba(168,85,247,.4)',
  zIndex: 9998, pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 8,
};
const badgeStyle = {
  background: '#a855f7', color: '#000', borderRadius: 99,
  padding: '2px 8px', fontSize: 10, fontWeight: 800,
};
const panelStyle = {
  position: 'fixed', right: 14, top: 70, bottom: 80, width: 320, maxWidth: '90vw',
  background: 'rgba(5, 3, 16, 0.92)', border: '1px solid rgba(168,85,247,.5)',
  borderRadius: 14, backdropFilter: 'blur(14px)',
  boxShadow: '0 10px 40px rgba(0,0,0,.6), 0 0 18px rgba(168,85,247,.3)',
  display: 'flex', flexDirection: 'column', zIndex: 9998, pointerEvents: 'auto',
  font: '14px/1.4 "Rubik", system-ui, sans-serif',
};
const headerStyle = {
  padding: '10px 14px', borderBottom: '1px solid rgba(168,85,247,.3)',
  display: 'flex', alignItems: 'center', gap: 8,
  background: 'linear-gradient(180deg, rgba(168,85,247,.18), transparent)',
  borderRadius: '14px 14px 0 0',
};
const titleStyle = {
  font: '800 12px/1 "Russo One", sans-serif', letterSpacing: '.14em', textTransform: 'uppercase',
  color: '#a855f7', textShadow: '0 0 10px #a855f7', flex: 1,
};
const countStyle = { color: '#9aa3c4', fontSize: 11, fontFamily: 'monospace' };
const closeStyle = {
  background: 'transparent', border: 0, color: '#fff', fontSize: 22,
  cursor: 'pointer', padding: '0 8px',
};
const feedStyle = {
  flex: 1, overflowY: 'auto', padding: '8px 12px',
  scrollbarWidth: 'thin', scrollbarColor: '#a855f7 transparent',
};
function msgStyle(hue, isMe) {
  return {
    padding: '8px 10px', margin: '6px 0',
    borderLeft: `3px solid hsl(${hue}, 90%, 65%)`,
    background: isMe
      ? `hsla(${hue}, 90%, 50%, .12)`
      : 'rgba(255,255,255,.03)',
    borderRadius: '4px 8px 8px 4px',
  };
}
function fromStyle(hue) {
  return {
    color: `hsl(${hue}, 90%, 70%)`, fontWeight: 700, fontSize: 11,
    fontFamily: '"Russo One", sans-serif', letterSpacing: '.04em',
    marginBottom: 3, display: 'flex', alignItems: 'center', gap: 8,
  };
}
const whenStyle = { color: '#6b7395', fontWeight: 400, fontSize: 10, marginLeft: 'auto' };
const bodyStyle = { color: '#f1f4ff', fontSize: 13, wordWrap: 'break-word' };
const emptyStyle = { color: '#6b7395', fontSize: 12, textAlign: 'center', padding: '20px 10px' };
const inputRowStyle = {
  display: 'flex', gap: 6, padding: 10, borderTop: '1px solid rgba(168,85,247,.3)',
  background: 'rgba(0,0,0,.4)', borderRadius: '0 0 14px 14px',
};
const inputStyle = {
  flex: 1, background: 'rgba(168,85,247,.08)', border: '1px solid rgba(168,85,247,.5)',
  borderRadius: 6, color: '#f1f4ff', padding: '7px 10px',
  font: '600 13px "Rubik", sans-serif',
};
const sendBtnStyle = {
  background: '#a855f7', color: '#000', border: 0, borderRadius: 6,
  padding: '7px 14px', font: '800 11px "Russo One", sans-serif',
  letterSpacing: '.12em', cursor: 'pointer',
};
