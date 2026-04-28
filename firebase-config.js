/* ============================================================
   FIREBASE CONFIG — Web SDK only. Safe to commit.

   ⚠️  DO NOT add a service account JSON or Database Secret here.
   Those are server-side admin credentials and grant full project
   access. They belong on Gary's home server, never in the browser.

   The values below are the public Web SDK config — `apiKey` here
   is a public identifier, not a secret. Real security lives in
   Firebase Realtime Database rules and Authentication.

   Project: data-44017
   ============================================================ */
window.AYDEN_FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAaLpDoD04pSYYWtatS6tlJlyf0vD_2a1Y",
  authDomain:        "data-44017.firebaseapp.com",
  databaseURL:       "https://data-44017-default-rtdb.firebaseio.com",
  projectId:         "data-44017",
  storageBucket:     "data-44017.firebasestorage.app",
  messagingSenderId: "582095031655",
  appId:             "1:582095031655:web:1d793237a9d6bb00f8b3c2"
  // measurementId intentionally omitted — Google Analytics for Firebase is NOT
  // COPPA-compliant for a child-targeted site (under-13). Do not add it back
  // and do not call getAnalytics() anywhere in this codebase.
};

window.AYDEN_ADMIN_USERNAME = "ayden";

/* Reminders for one-time Firebase console setup:
   1. Authentication → Sign-in method → Email/Password → Enable
      https://console.firebase.google.com/project/data-44017/authentication/providers
   2. Realtime Database → Create database (if not already)
      https://console.firebase.google.com/project/data-44017/database
   3. Lock down Realtime Database rules (recommended — see below).

   Suggested Realtime Database rules for Ayden's site:

   {
     "rules": {
       "users": {
         "$uid": {
           ".read":  "auth != null",
           ".write": "auth != null && auth.uid === $uid"
         }
       },
       "posts": {
         ".read":  "auth != null",
         "$pid": {
           ".write": "auth != null && (!data.exists() || newData.child('username').val() == root.child('users/' + auth.uid + '/username').val())",
           ".validate": "newData.hasChildren(['username','text','at']) && newData.child('text').val().length <= 600"
         }
       },
       "blocked": {
         ".read":  "auth != null",
         ".write": "auth != null && root.child('users').child(auth.uid).child('username').val() == 'ayden'"
       }
     }
   }
*/
