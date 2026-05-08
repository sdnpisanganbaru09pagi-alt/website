// ============================================================
// config.js — Konfigurasi Firebase
// Ganti nilai di bawah dengan kredensial Firebase project kamu:
//   Firebase Console → Project Settings → Your Apps → Firebase SDK snippet
// ============================================================

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDE0ZRyMdEAadi71XTdbxJli6DJRr0Mbv0",
  authDomain:        "website-sekolah-5b2a9.firebaseapp.com",
  projectId:         "website-sekolah-5b2a9",
  messagingSenderId: "234766835923",
  appId:             "1:234766835923:web:7e13ca67f8d72d9b9cf426",
  measurementId:     "G-2CLSHHW94N"
};

// Inisialisasi Firebase
firebase.initializeApp(FIREBASE_CONFIG);

// Export services ke window supaya bisa dipakai di file lain
window._auth = firebase.auth();
window._db   = firebase.firestore();

// Aktifkan persistence Firestore (offline support)
window._db.enablePersistence().catch(err => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence gagal: multiple tabs terbuka');
  } else if (err.code === 'unimplemented') {
    console.warn('Browser tidak mendukung persistence');
  }
});

console.log('✅ Firebase berhasil diinisialisasi');