// shared/firebase-identity.js
// SINGLE SOURCE OF TRUTH for who-the-user-is across the entire site.
//
// Loaded by index.html, kids.html, AND playground.html. All three pages share
// the same uid + display name + avatar + XP record in Firebase RTDB. Sign-in
// is anonymous by default (zero friction, instant identity), and any user can
// later "Save my account" to upgrade to email/password without losing data
// (via linkWithCredential — preserves uid + all RTDB nodes).
//
// Public surface (window.AYDEN_ID):
//   .ready           — Promise resolving once auth completes + profile loaded
//   .uid             — Firebase uid (anonymous or upgraded)
//   .isAnonymous     — boolean
//   .profile         — { displayName, avatar, hue, joinedAt }
//   .updateProfile(p)— merge-write to /users/{uid}/profile
//   .syncXP(o)       — write to /users/{uid}/xp
//   .syncPokedex(a)  — write to /users/{uid}/pokedex
//   .syncAvatar(a)   — write to /users/{uid}/profile/avatar
//   .upgradeToEmail(email, password) — link anon account → email auth (data preserved)
//   .signOut()
//   .onUser(cb)      — fires when uid or profile changes
//   .db              — RTDB instance (so consumers don't re-init)
//   .ref(path)       — convenience: ref(db, path)
//
// Schema:
//   /users/{uid}/profile  : { displayName, avatar:{face,hat,pet}, hue, joinedAt, isAnonymous }
//   /users/{uid}/xp       : { total, badges:[], questsDone:{} }
//   /users/{uid}/pokedex  : [ {name, sprite}, ... ]
//   /playground/presence/{uid} : { x, y, hue, name, ts }   (handled by playground/)

import { initializeApp, getApps }
  from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  getAuth, signInAnonymously, onAuthStateChanged, signOut,
  EmailAuthProvider, linkWithCredential, signInWithEmailAndPassword,
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  getDatabase, ref, get, set, update, onValue, off, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';

const PALETTE_S = 90, PALETTE_L = 62;

// ---------- helpers ----------
function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}
function hueFromUid(uid) { return fnv1a(uid) % 360; }

const ADJ = ['Brave','Cosmic','Mighty','Sneaky','Zappy','Glowing','Speedy','Pixel','Lucky','Wild','Star','Funky','Stormy','Sparkly','Atomic','Turbo','Mega','Ultra','Neon','Crystal'];
const NOUN= ['Fox','Wolf','Tiger','Dragon','Phoenix','Otter','Penguin','Falcon','Comet','Rocket','Nova','Wizard','Knight','Robot','Astronaut','Pilot','Ranger','Ninja','Captain','Hero'];
function nameFromUid(uid) {
  const h = fnv1a(uid);
  return `${ADJ[h % ADJ.length]}${NOUN[(h>>>8) % NOUN.length]}${(h>>>16) % 100}`;
}

// ---------- one-time bootstrap ----------
const cfg = window.AYDEN_FIREBASE_CONFIG;
if (!cfg) { console.error('[identity] AYDEN_FIREBASE_CONFIG missing — load firebase-config.js first'); }

const existing = getApps().find(a => a.options && a.options.projectId === cfg?.projectId);
const app  = existing || (cfg ? initializeApp(cfg) : null);
const auth = app ? getAuth(app) : null;
const db   = app ? getDatabase(app) : null;

const _userListeners = new Set();
let _user = null;
let _profile = null;
let _profileWatcher = null;

function emit() { for (const cb of _userListeners) { try { cb({ uid:_user?.uid, profile:_profile }); } catch(e){ console.warn(e); } } }

async function loadOrCreateProfile(uid, isAnonymous) {
  const pRef = ref(db, `users/${uid}/profile`);
  const snap = await get(pRef);
  if (snap.exists()) {
    _profile = snap.val();
    // Patch any missing fields (forward-compat with old/new schema)
    let dirty = false;
    if (!_profile.hue)         { _profile.hue = hueFromUid(uid); dirty = true; }
    if (!_profile.displayName) { _profile.displayName = nameFromUid(uid); dirty = true; }
    if (_profile.isAnonymous !== isAnonymous) { _profile.isAnonymous = isAnonymous; dirty = true; }
    if (dirty) await update(pRef, _profile);
  } else {
    _profile = {
      displayName: nameFromUid(uid),
      avatar:      { face: '🤖', hat: '👑', pet: '🐶' },
      hue:         hueFromUid(uid),
      isAnonymous,
      joinedAt:    Date.now(),
    };
    await set(pRef, _profile);
  }
  // Live-watch profile changes (other devices, profile edits via UI, etc.)
  if (_profileWatcher) off(_profileWatcher.r, 'value', _profileWatcher.cb);
  const cb = (s) => { if (s.exists()) { _profile = s.val(); emit(); } };
  onValue(pRef, cb);
  _profileWatcher = { r: pRef, cb };
}

// Returns Promise<void> — resolves once we have an authenticated user + loaded profile.
const _ready = new Promise((resolve, reject) => {
  if (!auth) { reject(new Error('Firebase not configured')); return; }
  let resolved = false;
  onAuthStateChanged(auth, async (u) => {
    if (u) {
      _user = u;
      try {
        await loadOrCreateProfile(u.uid, u.isAnonymous);
        emit();
        if (!resolved) { resolved = true; resolve(); }
      } catch (e) {
        console.warn('[identity] profile load failed:', e.message);
        if (!resolved) { resolved = true; resolve(); }   // still resolve so UI doesn't hang
      }
    } else {
      // No session — sign in anonymously. Auto-retry on transient failures.
      try { await signInAnonymously(auth); }
      catch (e) {
        console.error('[identity] anonymous sign-in failed (enable Anonymous in Firebase console)', e);
        if (!resolved) { resolved = true; reject(e); }
      }
    }
  });
});

// ---------- public API ----------
window.AYDEN_ID = {
  ready: _ready,
  get uid()         { return _user?.uid || null; },
  get isAnonymous() { return _user?.isAnonymous ?? true; },
  get profile()     { return _profile; },
  get user()        { return _user; },
  db, ref: (p) => ref(db, p),
  serverTimestamp,

  async updateProfile(patch) {
    if (!_user) throw new Error('not signed in');
    const pRef = ref(db, `users/${_user.uid}/profile`);
    await update(pRef, patch);
    _profile = { ..._profile, ...patch };
    emit();
  },

  async syncXP(xpObj) {
    if (!_user) return;
    await set(ref(db, `users/${_user.uid}/xp`), xpObj);
  },
  async syncPokedex(arr) {
    if (!_user) return;
    await set(ref(db, `users/${_user.uid}/pokedex`), arr);
  },
  async syncAvatar(av) {
    if (!_user) return;
    await update(ref(db, `users/${_user.uid}/profile`), { avatar: av });
    _profile = { ..._profile, avatar: av }; emit();
  },

  async loadXP() {
    if (!_user) return null;
    const s = await get(ref(db, `users/${_user.uid}/xp`));
    return s.exists() ? s.val() : null;
  },
  async loadPokedex() {
    if (!_user) return [];
    const s = await get(ref(db, `users/${_user.uid}/pokedex`));
    return s.exists() ? s.val() : [];
  },

  // Upgrade an anonymous account to email/password WITHOUT losing data.
  // Same uid → all RTDB nodes (xp, pokedex, profile, posts, presence) carry over.
  async upgradeToEmail(email, password) {
    if (!_user) throw new Error('not signed in');
    if (!_user.isAnonymous) throw new Error('already upgraded');
    const cred = EmailAuthProvider.credential(email, password);
    await linkWithCredential(_user, cred);
    await update(ref(db, `users/${_user.uid}/profile`), { isAnonymous: false, email });
    _profile = { ..._profile, isAnonymous: false, email }; emit();
    return _user;
  },

  // Existing users from old Claude's email flow can sign in directly.
  async signInWithEmail(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  },

  async signOut() {
    await signOut(auth);
    _user = null; _profile = null; emit();
    // After sign-out, immediately re-anon so the user always has identity.
    await signInAnonymously(auth);
  },

  onUser(cb) { _userListeners.add(cb); return () => _userListeners.delete(cb); },
};

// Resolve ready or log the error so consumers don't hang silently.
_ready.catch((e) => console.error('[identity] init failed:', e.message));
