// ============================================================
// auth.js — Login & Logout via Supabase Auth
// ============================================================

// Cek sesi saat halaman dimuat
async function checkSession() {
  const { data: { session } } = await _sb.auth.getSession();
  if (session) {
    // Sudah login → langsung ke admin panel
    enterAdmin(session.user);
  }
  // Subscribe ke perubahan auth
  _sb.auth.onAuthStateChange((_event, session) => {
    if (session) {
      enterAdmin(session.user);
    } else {
      exitAdmin();
    }
  });
}

// Proses login
async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  const btn   = document.querySelector('#loginPage .btn-primary');

  if (!email || !pass) {
    showToast('Email dan password wajib diisi', 'error');
    return;
  }

  // Loading state
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';

  const { data, error } = await _sb.auth.signInWithPassword({ email, password: pass });

  btn.disabled = false;
  btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Masuk ke Admin Panel';

  if (error) {
    showToast('Login gagal: ' + (error.message === 'Invalid login credentials'
      ? 'Email atau password salah' : error.message), 'error');
    return;
  }

  showToast('Selamat datang! Login berhasil.', '');
}

// Proses logout
async function doLogout() {
  await _sb.auth.signOut();
  showToast('Berhasil keluar dari admin panel', 'warn');
}

// Masuk ke tampilan admin
function enterAdmin(user) {
  document.getElementById('loginPage').classList.remove('active');
  document.getElementById('public-site').style.display = 'none';
  document.getElementById('admin-panel').classList.add('active');

  // Tampilkan email/nama admin di topbar
  const initials = user.email ? user.email.substring(0, 2).toUpperCase() : 'AD';
  const avatarEl = document.getElementById('adminAvatar');
  if (avatarEl) avatarEl.textContent = initials;
  const emailEl = document.getElementById('adminEmail');
  if (emailEl) emailEl.textContent = user.email;

  switchAdmin('dashboard', document.querySelector('.sidebar-item'));
}

// Keluar dari tampilan admin
function exitAdmin() {
  document.getElementById('admin-panel').classList.remove('active');
  document.getElementById('loginPage').classList.remove('active');
  document.getElementById('public-site').style.display = 'block';
  showPage('home', document.querySelector('.nav-menu a'));
}

// Tampilkan halaman login
function showLogin() {
  document.getElementById('loginPage').classList.add('active');
  document.getElementById('public-site').style.display = 'none';
}

// Kembali ke halaman publik dari login
function showPublic() {
  document.getElementById('loginPage').classList.remove('active');
  document.getElementById('public-site').style.display = 'block';
}

// Toggle password visibility
function togglePw() {
  const i = document.getElementById('loginPass');
  i.type = i.type === 'password' ? 'text' : 'password';
}

// Izinkan Enter untuk submit login
document.addEventListener('DOMContentLoaded', () => {
  const passEl = document.getElementById('loginPass');
  if (passEl) {
    passEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doLogin();
    });
  }
  checkSession();
});
