// ============================================================
// config.js — Konfigurasi Firebase (Auth + Firestore)
// Isi FIREBASE_CONFIG dari Firebase Console > Project Settings
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyDE0ZRyMdEAadi71XTdbxJli6DJRr0Mbv0",
  authDomain: "website-sekolah-5b2a9.firebaseapp.com",
  projectId: "website-sekolah-5b2a9",
  storageBucket: "website-sekolah-5b2a9.firebasestorage.app",
  messagingSenderId: "234766835923",
  appId: "1:234766835923:web:7e13ca67f8d72d9b9cf426",
  measurementId: "G-2CLSHHW94N"
};

firebase.initializeApp(FIREBASECONFIG);
const _fbAuth = firebase.auth();
const _fbDb = firebase.firestore();

class FbQuery {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.sorter = null;
    this.limitN = null;
    this.rangeCfg = null;
    this.mode = 'select';
    this.payload = null;
    this.countExact = false;
    this.head = false;
    this.singleRow = false;
    this.maybeSingleRow = false;
  }

  select(_cols = '*', opts = {}) {
    this.mode = 'select';
    this.countExact = opts?.count === 'exact';
    this.head = !!opts?.head;
    return this;
  }

  eq(field, value) { this.filters.push({ type: 'eq', field, value }); return this; }
  ilike(field, pattern) { this.filters.push({ type: 'ilike', field, pattern: String(pattern || '').toLowerCase().replaceAll('%', '') }); return this; }
  order(field, opts = {}) { this.sorter = { field, asc: opts.ascending !== false }; return this; }
  limit(n) { this.limitN = n; return this; }
  range(from, to) { this.rangeCfg = { from, to }; return this; }
  single() { this.singleRow = true; return this; }
  maybeSingle() { this.maybeSingleRow = true; return this; }
  insert(payload) { this.mode = 'insert'; this.payload = payload; return this; }
  update(payload) { this.mode = 'update'; this.payload = payload; return this; }
  delete() { this.mode = 'delete'; return this; }

  async execute() {
    try {
      const col = _fbDb.collection(this.table);

      if (this.mode === 'insert') {
        const now = new Date().toISOString();
        const row = Array.isArray(this.payload) ? this.payload[0] : this.payload;
        await col.add({ ...row, created_at: row.created_at || now, updated_at: now });
        return { error: null };
      }

      let query = col;
      this.filters.filter(f => f.type === 'eq').forEach(f => { query = query.where(f.field, '==', f.value); });
      if (this.sorter) query = query.orderBy(this.sorter.field, this.sorter.asc ? 'asc' : 'desc');
      if (this.limitN != null) query = query.limit(this.limitN);

      const snap = await query.get();
      let docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      this.filters.filter(f => f.type === 'ilike').forEach(f => {
        docs = docs.filter(x => String(x[f.field] || '').toLowerCase().includes(f.pattern));
      });

      if (this.rangeCfg) docs = docs.slice(this.rangeCfg.from, this.rangeCfg.to + 1);

      if (this.mode === 'update') {
        if (!docs.length) return { error: { message: 'Data tidak ditemukan' } };
        const now = new Date().toISOString();
        await Promise.all(docs.map(d => col.doc(d.id).update({ ...this.payload, updated_at: now })));
        return { error: null };
      }

      if (this.mode === 'delete') {
        await Promise.all(docs.map(d => col.doc(d.id).delete()));
        return { error: null };
      }

      const count = docs.length;
      if (this.head) return { count, data: null, error: null };
      if (this.singleRow) return docs[0] ? { data: docs[0], error: null } : { data: null, error: { message: 'Data tidak ditemukan' } };
      if (this.maybeSingleRow) return { data: docs[0] || null, error: null };
      return { data: docs, count: this.countExact ? count : null, error: null };
    } catch (e) {
      return { data: null, error: { message: e.message || 'Terjadi kesalahan Firebase' } };
    }
  }

  then(resolve, reject) { return this.execute().then(resolve, reject); }
}

window._sb = {
  from: (table) => new FbQuery(table),
  auth: {
    async getSession() {
      return { data: { session: _fbAuth.currentUser ? { user: _fbAuth.currentUser } : null } };
    },
    onAuthStateChange(cb) {
      return _fbAuth.onAuthStateChanged((user) => cb(user ? 'SIGNED_IN' : 'SIGNED_OUT', user ? { user } : null));
    },
    async signInWithPassword({ email, password }) {
      try {
        const cred = await _fbAuth.signInWithEmailAndPassword(email, password);
        return { data: { user: cred.user }, error: null };
      } catch (e) {
        return { data: null, error: { message: e.message } };
      }
    },
    async signOut() {
      await _fbAuth.signOut();
      return { error: null };
    }
  }
};
