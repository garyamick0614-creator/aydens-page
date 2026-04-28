/* ============================================================
   FIREBASE CONFIG — fill these in to enable real-time Friends Chat
   and cross-device User Accounts.

   To set up (one-time, ~10 minutes):
   1) Go to https://console.firebase.google.com/
   2) Create a new project (e.g. "aydens-page")
   3) Add a Web App. Copy the firebaseConfig values here.
   4) In the Firebase console:
        - Build > Authentication > Sign-in method > Email/Password = Enabled
        - Build > Realtime Database > Create database (test mode is fine for v1)
   5) Save this file. The Friends and Users features auto-enable on next reload.

   Until filled in, Friends Chat shows a "Setup needed" message and
   localStorage-only profile editing still works for Ayden.
   ============================================================ */
window.AYDEN_FIREBASE_CONFIG = {
  apiKey:            "",
  authDomain:        "",
  databaseURL:       "",
  projectId:         "",
  storageBucket:     "",
  messagingSenderId: "",
  appId:             ""
};

/* Optional: pin Ayden's username so the system always treats him as admin
   even before any friend signs up. Default: "ayden". */
window.AYDEN_ADMIN_USERNAME = "ayden";
