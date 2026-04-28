// shared/chat-widget.js
// Drop-in floating chat bubble that wires to Firebase RTDB /posts/*. Anyone
// with a saved displayName can read + post. Auto-mounts on any page that
// loads firebase-config.js + shared/firebase-identity.js.
//
// Usage: <script src="shared/chat-widget.js?v=..." defer></script>
// (Order: firebase-config.js → firebase-identity.js (module) → this file)

(function () {
  'use strict';
  if (window.__AYDEN_CHAT_WIDGET) return;
  window.__AYDEN_CHAT_WIDGET = true;

  function whenIdReady(cb) {
    if (window.AYDEN_ID && window.AYDEN_ID.ready) {
      window.AYDEN_ID.ready.then(cb).catch(() => {});
    } else {
      var n = 0;
      var i = setInterval(function () {
        if (window.AYDEN_ID && window.AYDEN_ID.ready) {
          clearInterval(i);
          window.AYDEN_ID.ready.then(cb).catch(function () {});
        } else if (++n > 60) clearInterval(i);
      }, 250);
    }
  }
  function escH(s){return String(s||'').replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

  function buildUI() {
    var style = document.createElement('style');
    style.textContent =
      '#ay-chat-fab{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#ff2bd6,#b400ff);border:none;color:#fff;font-size:26px;cursor:pointer;box-shadow:0 4px 20px rgba(255,43,214,.6),0 0 12px rgba(180,0,255,.4);z-index:9990;display:flex;align-items:center;justify-content:center;transition:transform .15s;font-family:"Apple Color Emoji","Segoe UI Emoji",sans-serif}' +
      '#ay-chat-fab:hover{transform:scale(1.1)}' +
      '#ay-chat-fab .ay-badge{position:absolute;top:-2px;right:-2px;background:#ffd000;color:#000;border-radius:99px;padding:0 6px;font-size:11px;font-weight:800;font-family:"Russo One",sans-serif;min-width:18px;text-align:center}' +
      '#ay-chat-panel{position:fixed;bottom:88px;right:20px;width:340px;max-width:calc(100vw - 40px);height:480px;max-height:70vh;background:rgba(5,3,16,.95);border:1px solid rgba(255,43,214,.6);border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.6),0 0 20px rgba(255,43,214,.2);display:none;flex-direction:column;z-index:9991;backdrop-filter:blur(14px);font-family:"Russo One","Rubik",system-ui,sans-serif}' +
      '#ay-chat-panel.open{display:flex}' +
      '#ay-chat-head{padding:12px 14px;border-bottom:1px solid rgba(255,43,214,.3);background:linear-gradient(180deg,rgba(255,43,214,.18),transparent);display:flex;justify-content:space-between;align-items:center;border-radius:14px 14px 0 0}' +
      '#ay-chat-head .ay-title{font:800 13px "Russo One",sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#ff2bd6;text-shadow:0 0 10px #ff2bd6}' +
      '#ay-chat-head .ay-close{background:transparent;border:none;color:#fff;font-size:20px;cursor:pointer;padding:0 6px}' +
      '#ay-chat-feed{flex:1;overflow-y:auto;padding:10px 12px;font-family:"Rubik",system-ui,sans-serif;font-size:13px}' +
      '#ay-chat-feed::-webkit-scrollbar{width:4px}#ay-chat-feed::-webkit-scrollbar-thumb{background:#ff2bd6;border-radius:2px}' +
      '.ay-msg{padding:7px 0;border-bottom:1px dashed rgba(255,255,255,.06);line-height:1.4;color:#f1f4ff}' +
      '.ay-msg .ay-from{color:#ff2bd6;font-weight:700;font-family:"Russo One",sans-serif;font-size:11px;letter-spacing:.04em}' +
      '.ay-msg .ay-when{color:#6b7395;font-size:10px;margin-left:6px}' +
      '#ay-chat-input-row{display:flex;gap:6px;padding:10px;border-top:1px solid rgba(255,43,214,.3);background:rgba(0,0,0,.4)}' +
      '#ay-chat-input{flex:1;background:rgba(255,43,214,.08);border:1px solid rgba(255,43,214,.5);border-radius:6px;color:#f1f4ff;padding:7px 10px;font:600 13px "Rubik",sans-serif}' +
      '#ay-chat-send{background:#ff2bd6;color:#000;border:none;border-radius:6px;padding:7px 14px;font:800 11px "Russo One",sans-serif;letter-spacing:.12em;cursor:pointer}' +
      '#ay-chat-status{padding:0 12px 6px;font-size:10px;color:#6b7395;text-align:center}' +
      '@media (max-width:480px){#ay-chat-panel{right:8px;left:8px;bottom:78px;width:auto}}';
    document.head.appendChild(style);

    var fab = document.createElement('button');
    fab.id = 'ay-chat-fab';
    fab.title = 'Open friends chat';
    fab.innerHTML = '💬<span class="ay-badge" id="ay-chat-badge" style="display:none">0</span>';
    document.body.appendChild(fab);

    var panel = document.createElement('div');
    panel.id = 'ay-chat-panel';
    panel.innerHTML =
      '<div id="ay-chat-head">' +
      '  <span class="ay-title">◉ FRIENDS CHAT</span>' +
      '  <button class="ay-close" type="button" aria-label="Close">×</button>' +
      '</div>' +
      '<div id="ay-chat-feed"></div>' +
      '<div id="ay-chat-status">Connecting…</div>' +
      '<div id="ay-chat-input-row">' +
      '  <input id="ay-chat-input" type="text" placeholder="Type a message…" maxlength="240" autocomplete="off">' +
      '  <button id="ay-chat-send" type="button">SEND</button>' +
      '</div>';
    document.body.appendChild(panel);

    fab.addEventListener('click', function () {
      panel.classList.toggle('open');
      var badge = document.getElementById('ay-chat-badge');
      if (badge) badge.style.display = 'none';
      if (panel.classList.contains('open')) document.getElementById('ay-chat-input').focus();
    });
    panel.querySelector('.ay-close').addEventListener('click', function () { panel.classList.remove('open'); });
    return { fab: fab, panel: panel };
  }

  function init() {
    var ui = buildUI();
    var feed = document.getElementById('ay-chat-feed');
    var input = document.getElementById('ay-chat-input');
    var send = document.getElementById('ay-chat-send');
    var status = document.getElementById('ay-chat-status');
    var badge = document.getElementById('ay-chat-badge');

    whenIdReady(function () {
      if (!window.AYDEN_ID || !window.AYDEN_ID.db) {
        status.textContent = 'Chat unavailable — Firebase not connected.';
        return;
      }
      status.textContent = 'Posting as: ' + ((window.AYDEN_ID.profile && window.AYDEN_ID.profile.displayName) || '...');
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js').then(function (mod) {
        var ref = mod.ref, push = mod.push, query = mod.query, limitToLast = mod.limitToLast, onChildAdded = mod.onChildAdded;
        var q = query(ref(window.AYDEN_ID.db, 'posts'), limitToLast(40));
        feed.innerHTML = '';
        var first = true; var unseen = 0;
        onChildAdded(q, function (snap) {
          var v = snap.val(); if (!v) return;
          var when = v.at ? new Date(v.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          var row = document.createElement('div');
          row.className = 'ay-msg';
          row.innerHTML = '<span class="ay-from">' + escH(v.username || '?') + '</span>'
                       + '<span class="ay-when">' + escH(when) + '</span>'
                       + '<div>' + escH(v.text || '') + '</div>';
          feed.appendChild(row);
          feed.scrollTop = feed.scrollHeight;
          if (!first && !ui.panel.classList.contains('open')) {
            unseen++; badge.textContent = unseen; badge.style.display = 'inline-block';
          }
          first = false;
        });

        function sendMsg() {
          var text = (input.value || '').trim(); if (!text) return;
          if (text.length > 240) { status.textContent = '✗ Too long.'; return; }
          var username = (window.AYDEN_ID.profile && window.AYDEN_ID.profile.displayName) || 'guest';
          push(ref(window.AYDEN_ID.db, 'posts'), {
            username: username, uid: window.AYDEN_ID.uid, text: text, at: Date.now(),
          }).then(function () { input.value = ''; }).catch(function (e) {
            status.textContent = '✗ ' + ((e && e.message) || 'Send failed');
          });
        }
        send.addEventListener('click', sendMsg);
        input.addEventListener('keydown', function (e) { if (e.key === 'Enter') sendMsg(); });
      }).catch(function (e) {
        status.textContent = 'Chat module load failed: ' + (e.message || '');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
