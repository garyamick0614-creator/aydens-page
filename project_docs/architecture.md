# Architecture — Shared Playground

## Stack

- **React 18 UMD** loaded via unpkg CDN — no build pipeline yet (Phase 1)
- **Firebase Web SDK 10.12.5** ESM modules from `gstatic.com`
- **Modules** written as plain JS using `React.createElement` (alias `h`).
  Equivalent JSX shown in comments above each `h()` call. 1:1 portable to Vite + .jsx later.
- **No bundler.** Each module is a `<script type="module">` import. Browser handles
  resolution. CSP stays tight (no `'unsafe-eval'` for Babel standalone).

## File layout

```
/playground.html                          ← Phase 1 entry, mount root, CSP-clean
/playground/
  /core/
    PlaygroundProvider.js                 ← Firebase init + Anon Auth + React Context
    config.js                             ← DB paths, throttle Hz, color palette
    mount.js                              ← ReactDOM.createRoot wrapper
  /hooks/
    useFirebase.js                        ← consume PlaygroundContext
    useThrottledFn.js                     ← rAF-based throttler (returns ref-stable fn)
    usePresence.js                        ← mouse → ref → throttled RTDB write @ 30Hz
    usePresencePeers.js                   ← subscribe to /presence; expose peerRef map
  /components/
    PresenceManager.js                    ← peer cursor renderer (DOM-mutation pool)
    ParticleField.js                      ← canvas mouse-trail particles (own rAF)
    DebugHUD.js                           ← optional: peer count, fps, my uid/hue
  /utils/
    rng.js                                ← deterministic color/name from uid
```

## Firebase RTDB schema (Phase 1)

```
/playground/
  presence/
    {uid}: { x: number, y: number, hue: number, name: string, ts: serverTimestamp }
    # ephemeral. onDisconnect().remove() is set the moment the user authenticates.
```

**Phase 2 will add:**
```
  physics/
    {objectId}: { x, y, vx, vy, owner: uid, type, ts }
```

**Phase 3 will add:**
```
  reactions/
    {ts}: { uid, hue, emoji }            # last 50, server-side trim later
  guestbook/
    {uid}: { name, msg, ts }
```

**Phase 4 will add:**
```
  state/
    theme: { themeKey, ts, by }
```

## Suggested RTDB rules (apply when ready)

```json
{
  "rules": {
    "playground": {
      "presence": {
        "$uid": {
          ".read":  "auth != null",
          ".write": "auth != null && auth.uid === $uid",
          ".validate": "newData.hasChildren(['x','y','hue','ts']) && newData.child('ts').isNumber()"
        }
      },
      "physics": {
        ".read":  "auth != null",
        "$id": {
          ".write": "auth != null && (!data.exists() || data.child('owner').val() === auth.uid || (now - data.child('ts').val()) > 2000)"
        }
      },
      "reactions": {
        ".read":  "auth != null",
        "$ts": { ".write": "auth != null && newData.child('uid').val() === auth.uid" }
      },
      "guestbook": {
        ".read":  "auth != null",
        "$uid":  { ".write": "auth != null && auth.uid === $uid" }
      },
      "state": {
        "theme": {
          ".read":  "auth != null",
          ".write": "auth != null"
        }
      }
    }
  }
}
```

The `physics` rule encodes the 2-second "last toucher owns" authority model:
non-owners can write only after 2s of stillness, preventing tug-of-war.

## Performance invariants (DO NOT REGRESS)

| Source | Frequency | Sink | React state? |
|---|---|---|---|
| `mousemove` | per event | `mouseRef.current` | NO |
| local rAF tick | 60Hz | reads `mouseRef`, throttles to RTDB at 30Hz | NO |
| RTDB `onChildChanged` | per peer event | `peersRef.current[uid]` | NO |
| RTDB `onChildAdded` / `Removed` | join/leave | `peersRef` + `setPeerCount(n)` | YES (re-render) |
| Cursor render rAF | 60Hz | mutates DOM `transform` on pre-mounted divs | NO |
| Particle render rAF | 60Hz | canvas `drawImage` calls | NO |

If you ever see "Rendered too many hooks" or React DevTools shows `<PresenceManager>`
re-rendering during cursor movement, the contract is broken — fix before merging.

## Why no JSX in Phase 1

`<script type="module">` with native ESM imports needs no transformer if we don't
write JSX. Babel standalone in the browser would force `script-src 'unsafe-eval'`,
and this is a kid-targeted site under a strict CSP. JSX comes back the moment we
move to a Vite project; the modules port unchanged.
