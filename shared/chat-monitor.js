// shared/chat-monitor.js
// Wraps fetch() so EVERY call to /api/public/chat (or any AI endpoint) on the
// home server is also POSTed to /api/aydens/chat-log — server re-runs the
// abuse regex and pushes Gary an immediate notification on a hit.
//
// Also installs a window.onerror handler so JS errors in the browser get
// piped to /api/aydens/errors with cooldown-gated push notification.
//
// Loaded by index.html (and any page that wants the safety net).

(function () {
  'use strict';
  var API = 'https://api.thatcomputerguy26.org';

  function getUser() {
    try {
      if (window.AYDEN_ID && window.AYDEN_ID.profile && window.AYDEN_ID.profile.displayName) {
        return window.AYDEN_ID.profile.displayName.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || 'ayden';
      }
    } catch (_) {}
    return 'ayden';
  }

  function logChat(prompt, response, kind, source) {
    if (!prompt) return;
    try {
      fetch(API + '/api/aydens/chat-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: getUser(),
          kind: (kind || 'chat').slice(0, 24),
          source: (source || (location.pathname + location.hash || '/')).slice(0, 64),
          prompt: String(prompt).slice(0, 8000),
          response: response ? String(response).slice(0, 20000) : null,
        }),
        keepalive: true,                     // survive page navigation
      }).catch(function(){});                  // best-effort, don't bubble
    } catch (_) {}
  }
  window.AYDEN_LOG_CHAT = logChat;            // exposed so individual UIs can call it directly

  // ---- fetch() interception ----
  // Catch every POST to /api/public/* AI endpoint. Read both prompt + response
  // by tee-ing the body. We DO NOT block the original call — the chat-log POST
  // happens in parallel (fire-and-forget). On failure, the kid still sees the AI
  // reply; only the audit log is missed.
  var _origFetch = window.fetch;
  if (_origFetch && !_origFetch._aydenWrapped) {
    var wrapped = function (input, init) {
      var url = (typeof input === 'string') ? input : (input && input.url) || '';
      var method = (init && init.method) || (typeof input === 'object' && input.method) || 'GET';
      var isAi = /\/api\/public\/(chat|vision|summarize|code)\b/.test(url) && method.toUpperCase() === 'POST';
      var promptStr = null;
      if (isAi && init && init.body) {
        try {
          var b = init.body;
          if (typeof b === 'string') {
            var parsed = JSON.parse(b);
            promptStr = parsed.prompt || parsed.messages?.slice(-1)?.[0]?.content || parsed.text || JSON.stringify(parsed);
          }
        } catch (_) { promptStr = null; }
      }
      var p = _origFetch.apply(this, arguments);
      if (isAi && promptStr) {
        // Tee the response body without consuming it for the caller.
        p.then(function (resp) {
          if (!resp || !resp.clone) return;
          resp.clone().text().then(function (text) {
            var response = '';
            try {
              var j = JSON.parse(text);
              response = j.response || j.text || j.message || j.content || JSON.stringify(j).slice(0, 2000);
            } catch (_) { response = text.slice(0, 2000); }
            logChat(promptStr, response, url.indexOf('vision') > -1 ? 'vision' : 'chat', location.pathname + location.hash);
          }).catch(function () {});
        }).catch(function () {});
      }
      return p;
    };
    wrapped._aydenWrapped = true;
    window.fetch = wrapped;
  }

  // ---- error reporter ----
  var _errCooldown = Object.create(null);
  function reportErr(payload) {
    var sig = (payload.page || '') + '|' + (payload.msg || '').slice(0, 100);
    var now = Date.now();
    if (_errCooldown[sig] && (now - _errCooldown[sig]) < 60000) return;  // 1 min client-side dedupe
    _errCooldown[sig] = now;
    try {
      fetch(API + '/api/aydens/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(function(){});
    } catch (_) {}
  }

  window.addEventListener('error', function (ev) {
    reportErr({
      user: getUser(),
      page: location.pathname + (location.hash || ''),
      msg:  String(ev.message || ev.error || 'unknown').slice(0, 500),
      src:  ev.filename || '',
      line: ev.lineno || null,
      col:  ev.colno || null,
      stack: (ev.error && ev.error.stack) ? String(ev.error.stack).slice(0, 2000) : null,
      url:  location.href.slice(0, 400),
      ua:   navigator.userAgent.slice(0, 300),
    });
  });

  window.addEventListener('unhandledrejection', function (ev) {
    var r = ev && ev.reason;
    reportErr({
      user: getUser(),
      page: location.pathname + (location.hash || ''),
      msg:  'unhandledrejection: ' + (typeof r === 'string' ? r : (r && r.message) || 'unknown').slice(0, 480),
      stack: (r && r.stack) ? String(r.stack).slice(0, 2000) : null,
      url:  location.href.slice(0, 400),
      ua:   navigator.userAgent.slice(0, 300),
    });
  });

  console.log('[chat-monitor] active — AI calls + JS errors will be relayed to home server');
})();
