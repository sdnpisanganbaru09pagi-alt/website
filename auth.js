// ============================================================
// auth.js — Login & Logout via Firebase Auth
// ============================================================

// Cek sesi saat halaman dimuat
function checkSession() {
  _auth.onAuthStateChanged((user) => {
    if (user) {
      enterAdmin(user);
    } else {
      exitAdmin();
    }
  });
}

// Proses login
async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  const btn   = document.querySelector('#loginPage .btn-login');

  if (!email || !pass) {
    showToast('Email dan password wajib diisi', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';

  try {
    await _auth.signInWithEmailAndPassword(email, pass);
    showToast('Selamat datang! Login berhasil.', 'success');
  } catch (err) {
    let msg = err.message;
    if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
      msg = 'Email atau password salah';
    } else if (err.code === 'auth/too-many-requests') {
      msg = 'Terlalu banyak percobaan. Coba lagi nanti.';
    } else if (err.code === 'auth/invalid-email') {
      msg = 'Format email tidak valid';
    }
    showToast('Login gagal: ' + msg, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Masuk ke Admin Panel';
  }
}

// Proses logout
async function doLogout() {
  if (!confirm('Yakin ingin keluar dari admin panel?')) return;
  await _auth.signOut();
  showToast('Berhasil keluar dari admin panel', 'warn');
}

// Masuk ke tampilan admin
function enterAdmin(user) {
  document.getElementById('loginPage').classList.remove('active');
  document.getElementById('publicSite').style.display = 'none';
  document.getElementById('adminPanel').classList.add('active');

  const initials = user.email ? user.email.substring(0, 2).toUpperCase() : 'AD';
  const avatarEl = document.getElementById('adminAvatar');
  if (avatarEl) avatarEl.textContent = initials;
  const emailEl = document.getElementById('adminEmail');
  if (emailEl) emailEl.textContent = user.email;

  switchAdmin('dashboard');
  loadDashboard();
}

// Keluar dari tampilan admin
function exitAdmin() {
  document.getElementById('adminPanel').classList.remove('active');
  document.getElementById('loginPage').classList.remove('active');
  document.getElementById('publicSite').style.display = 'block';
}

// Tampilkan halaman login
function showLogin() {
  document.getElementById('loginPage').classList.add('active');
  document.getElementById('publicSite').style.display = 'none';
}

// Kembali ke halaman publik dari login
function showPublic() {
  document.getElementById('loginPage').classList.remove('active');
  document.getElementById('publicSite').style.display = 'block';
}

// Toggle password visibility
function togglePw() {
  const i = document.getElementById('loginPass');
  const icon = document.getElementById('togglePwIcon');
  if (i.type === 'password') {
    i.type = 'text';
    if (icon) icon.className = 'fa-solid fa-eye-slash';
  } else {
    i.type = 'password';
    if (icon) icon.className = 'fa-solid fa-eye';
  }
}

// Izinkan Enter untuk submit login
document.addEventListener('DOMContentLoaded', () => {
  const passEl = document.getElementById('loginPass');
  if (passEl) passEl.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  const emailEl = document.getElementById('loginEmail');
  if (emailEl) emailEl.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  checkSession();
});