// ============================================================
// admin.js — Fungsi CRUD Admin Panel (Firebase Firestore)
// ============================================================

// ──────────────────────────────────────────
// NAVIGASI ADMIN
// ──────────────────────────────────────────
function switchAdmin(section) {
  document.querySelectorAll('.admin-section').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));

  const target = document.getElementById('section-' + section);
  if (target) target.classList.add('active');

  const navItem = document.querySelector(`.sidebar-item[data-section="${section}"]`);
  if (navItem) navItem.classList.add('active');

  // Load data sesuai seksi
  if (section === 'dashboard') loadDashboard();
  else if (section === 'halaman') loadHalaman();
  else if (section === 'berita') loadBerita();
  else if (section === 'galeri') loadGaleri();
  else if (section === 'pesan') loadPesan();
  else if (section === 'pengaturan') loadPengaturan();
}

// ──────────────────────────────────────────
// TOAST NOTIFICATION
// ──────────────────────────────────────────
function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warn: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 50);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ──────────────────────────────────────────
// FORMAT TANGGAL
// ──────────────────────────────────────────
function formatDate(ts) {
  if (!ts) return '-';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateInput(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toISOString().split('T')[0];
}

// ──────────────────────────────────────────
// KOMPRESI GAMBAR → WebP Base64 (tanpa Storage)
// maxWidth: lebar maks output, quality: 0-1
// ──────────────────────────────────────────
function imageToBase64WebP(file, maxWidth = 900, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = e => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        // Hitung dimensi baru dengan mempertahankan rasio
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }

        const canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        // Export sebagai WebP; fallback ke JPEG jika browser tidak support
        const mime   = canvas.toDataURL('image/webp').startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';
        const base64 = canvas.toDataURL(mime, quality);
        resolve(base64);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ──────────────────────────────────────────
// DASHBOARD
// ──────────────────────────────────────────
async function loadDashboard() {
  try {
    const [beritaSnap, pesanSnap, halamanSnap] = await Promise.all([
      _db.collection('berita').get(),
      _db.collection('pesan').get(),
      _db.collection('halaman').get()
    ]);

    document.getElementById('dashBerita').textContent = beritaSnap.size;
    document.getElementById('dashPesan').textContent = pesanSnap.size;
    document.getElementById('dashHalaman').textContent = halamanSnap.size;

    const belumDibaca = pesanSnap.docs.filter(d => !d.data().dibaca).length;
    document.getElementById('dashPesanBaru').textContent = belumDibaca + ' belum dibaca';

    // Berita terbaru
    const beritaList = beritaSnap.docs
      .sort((a, b) => (b.data().createdAt?.seconds || 0) - (a.data().createdAt?.seconds || 0))
      .slice(0, 5);

    const tbody = document.getElementById('dashBeritaList');
    tbody.innerHTML = beritaList.length === 0
      ? '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:20px">Belum ada berita</td></tr>'
      : beritaList.map(doc => {
          const d = doc.data();
          return `<tr>
            <td>${d.judul || '-'}</td>
            <td>${formatDate(d.createdAt)}</td>
            <td><span class="badge badge-${d.status === 'tayang' ? 'green' : 'amber'}">${d.status === 'tayang' ? 'Tayang' : 'Draft'}</span></td>
            <td>
              <button class="btn-icon" onclick="editBerita('${doc.id}')"><i class="fa-solid fa-pen"></i></button>
              <button class="btn-icon btn-danger-icon" onclick="hapusBerita('${doc.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
          </tr>`;
        }).join('');

    // Pesan terbaru
    const pesanList = pesanSnap.docs
      .sort((a, b) => (b.data().createdAt?.seconds || 0) - (a.data().createdAt?.seconds || 0))
      .slice(0, 4);

    const pesanTbody = document.getElementById('dashPesanList');
    pesanTbody.innerHTML = pesanList.length === 0
      ? '<tr><td colspan="3" style="text-align:center;color:#aaa;padding:20px">Belum ada pesan</td></tr>'
      : pesanList.map(doc => {
          const d = doc.data();
          return `<tr class="${!d.dibaca ? 'pesan-baru' : ''}">
            <td><strong>${d.nama || '-'}</strong></td>
            <td>${d.subjek || '-'}</td>
            <td><span class="badge badge-${d.dibaca ? 'gray' : 'amber'}">${d.dibaca ? 'Dibaca' : 'Baru'}</span></td>
          </tr>`;
        }).join('');

  } catch (err) {
    console.error('loadDashboard error:', err);
  }
}

// ──────────────────────────────────────────
// HALAMAN STATIS
// ──────────────────────────────────────────
async function loadHalaman() {
  const list = document.getElementById('halamanList');
  list.innerHTML = '<tr><td colspan="3" class="loading-cell"><i class="fa-solid fa-spinner fa-spin"></i> Memuat...</td></tr>';

  try {
    const snap = await _db.collection('halaman').orderBy('urutan').get();
    if (snap.empty) {
      list.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#aaa;padding:20px">Belum ada halaman. Klik "Tambah Halaman" untuk memulai.</td></tr>';
      return;
    }
    list.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      return `<tr>
        <td>${d.urutan || '-'}</td>
        <td><strong>${d.judul || '-'}</strong><br><small style="color:#888">${d.slug || ''}</small></td>
        <td><span class="badge badge-${d.aktif ? 'green' : 'gray'}">${d.aktif ? 'Aktif' : 'Nonaktif'}</span></td>
        <td>
          <button class="btn-icon" onclick="editHalaman('${doc.id}')"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-icon btn-danger-icon" onclick="hapusHalaman('${doc.id}', '${d.judul}')"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>`;
    }).join('');
  } catch (err) {
    list.innerHTML = `<tr><td colspan="4" style="color:red;padding:16px">Error: ${err.message}</td></tr>`;
  }
}

function showFormHalaman(data = {}, id = null) {
  document.getElementById('formHalamanId').value = id || '';
  document.getElementById('formHalamanJudul').value = data.judul || '';
  document.getElementById('formHalamanSlug').value = data.slug || '';
  document.getElementById('formHalamanUrutan').value = data.urutan || '';
  document.getElementById('formHalamanIsi').value = data.isi || '';
  document.getElementById('formHalamanAktif').checked = data.aktif !== false;
  document.getElementById('modalHalaman').classList.add('active');
}

function closeFormHalaman() {
  document.getElementById('modalHalaman').classList.remove('active');
}

async function editHalaman(id) {
  const doc = await _db.collection('halaman').doc(id).get();
  showFormHalaman(doc.data(), id);
}

async function simpanHalaman() {
  const id     = document.getElementById('formHalamanId').value;
  const judul  = document.getElementById('formHalamanJudul').value.trim();
  const slug   = document.getElementById('formHalamanSlug').value.trim().toLowerCase().replace(/\s+/g, '-');
  const urutan = parseInt(document.getElementById('formHalamanUrutan').value) || 99;
  const isi    = document.getElementById('formHalamanIsi').value.trim();
  const aktif  = document.getElementById('formHalamanAktif').checked;

  if (!judul) { showToast('Judul halaman wajib diisi', 'error'); return; }

  const payload = { judul, slug, urutan, isi, aktif, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };

  try {
    if (id) {
      await _db.collection('halaman').doc(id).update(payload);
      showToast('Halaman berhasil diperbarui', 'success');
    } else {
      payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await _db.collection('halaman').add(payload);
      showToast('Halaman berhasil ditambahkan', 'success');
    }
    closeFormHalaman();
    loadHalaman();
  } catch (err) {
    showToast('Gagal menyimpan: ' + err.message, 'error');
  }
}

async function hapusHalaman(id, judul) {
  if (!confirm(`Hapus halaman "${judul}"?`)) return;
  try {
    await _db.collection('halaman').doc(id).delete();
    showToast('Halaman berhasil dihapus', 'warn');
    loadHalaman();
  } catch (err) {
    showToast('Gagal menghapus: ' + err.message, 'error');
  }
}

// Auto-generate slug dari judul
document.addEventListener('DOMContentLoaded', () => {
  const judulEl = document.getElementById('formHalamanJudul');
  const slugEl  = document.getElementById('formHalamanSlug');
  if (judulEl && slugEl) {
    judulEl.addEventListener('input', () => {
      if (!document.getElementById('formHalamanId').value) {
        slugEl.value = judulEl.value.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      }
    });
  }
});

// ──────────────────────────────────────────
// BERITA
// ──────────────────────────────────────────
async function loadBerita(filter = 'semua') {
  const list = document.getElementById('beritaList');
  list.innerHTML = '<tr><td colspan="5" class="loading-cell"><i class="fa-solid fa-spinner fa-spin"></i> Memuat...</td></tr>';

  try {
    let query = _db.collection('berita').orderBy('createdAt', 'desc');
    const snap = await query.get();

    let docs = snap.docs;
    if (filter === 'tayang') docs = docs.filter(d => d.data().status === 'tayang');
    else if (filter === 'draft') docs = docs.filter(d => d.data().status === 'draft');

    if (docs.length === 0) {
      list.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#aaa;padding:20px">Belum ada berita.</td></tr>';
      return;
    }
    list.innerHTML = docs.map(doc => {
      const d = doc.data();
      return `<tr>
        <td><strong>${d.judul || '-'}</strong><br><small style="color:#888">${d.kategori || 'Umum'}</small></td>
        <td>${formatDate(d.createdAt)}</td>
        <td><span class="badge badge-${d.status === 'tayang' ? 'green' : 'amber'}">${d.status === 'tayang' ? 'Tayang' : 'Draft'}</span></td>
        <td>
          <button class="btn-icon" onclick="editBerita('${doc.id}')"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-icon btn-danger-icon" onclick="hapusBerita('${doc.id}', '${(d.judul || '').replace(/'/g, '')}')"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>`;
    }).join('');
  } catch (err) {
    list.innerHTML = `<tr><td colspan="5" style="color:red;padding:16px">Error: ${err.message}</td></tr>`;
  }
}

function showFormBerita(data = {}, id = null) {
  document.getElementById('formBeritaId').value = id || '';
  document.getElementById('formBeritaJudul').value = data.judul || '';
  document.getElementById('formBeritaKategori').value = data.kategori || 'Pengumuman';
  document.getElementById('formBeritaIsi').value = data.isi || '';
  document.getElementById('formBeritaStatus').value = data.status || 'draft';
  document.getElementById('formBeritaFoto').value = '';
  document.getElementById('beritaFotoPreview').src = data.foto || '';
  document.getElementById('beritaFotoPreview').style.display = data.foto ? 'block' : 'none';
  document.getElementById('modalBerita').classList.add('active');
}

function closeFormBerita() {
  document.getElementById('modalBerita').classList.remove('active');
}

async function editBerita(id) {
  const doc = await _db.collection('berita').doc(id).get();
  showFormBerita(doc.data(), id);
}

async function simpanBerita() {
  const id        = document.getElementById('formBeritaId').value;
  const judul     = document.getElementById('formBeritaJudul').value.trim();
  const kategori  = document.getElementById('formBeritaKategori').value;
  const isi       = document.getElementById('formBeritaIsi').value.trim();
  const status    = document.getElementById('formBeritaStatus').value;
  const fotoFile  = document.getElementById('formBeritaFoto').files[0];

  if (!judul || !isi) { showToast('Judul dan isi berita wajib diisi', 'error'); return; }

  const btn = document.getElementById('btnSimpanBerita');
  btn.disabled = true;
  btn.textContent = 'Menyimpan...';

  try {
    let fotoBase64 = null;

    // Kompresi & konversi gambar ke WebP base64 (tanpa Firebase Storage)
    if (fotoFile) {
      showToast('Mengkompresi gambar...', 'info');
      fotoBase64 = await imageToBase64WebP(fotoFile, 900, 0.75);
    }

    const payload = {
      judul, kategori, isi, status,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (fotoBase64) payload.foto = fotoBase64;

    if (id) {
      await _db.collection('berita').doc(id).update(payload);
      showToast('Berita berhasil diperbarui', 'success');
    } else {
      payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await _db.collection('berita').add(payload);
      showToast('Berita berhasil ditambahkan', 'success');
    }
    closeFormBerita();
    loadBerita();
  } catch (err) {
    showToast('Gagal menyimpan: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Simpan Berita';
  }
}

async function hapusBerita(id, judul) {
  if (!confirm(`Hapus berita "${judul}"?`)) return;
  try {
    await _db.collection('berita').doc(id).delete();
    showToast('Berita berhasil dihapus', 'warn');
    loadBerita();
  } catch (err) {
    showToast('Gagal menghapus: ' + err.message, 'error');
  }
}

// Preview foto berita sebelum upload
document.addEventListener('DOMContentLoaded', () => {
  const fotoInput = document.getElementById('formBeritaFoto');
  if (fotoInput) {
    fotoInput.addEventListener('change', async () => {
      const file = fotoInput.files[0];
      const preview = document.getElementById('beritaFotoPreview');
      if (file) {
        const base64 = await imageToBase64WebP(file, 900, 0.75);
        preview.src = base64;
        preview.style.display = 'block';
        const kb = Math.round(base64.length * 0.75 / 1024);
        showToast(`Gambar dikompres: ±${kb} KB`, 'info');
      }
    });
  }
});

// ──────────────────────────────────────────
// GALERI
// ──────────────────────────────────────────
async function loadGaleri() {
  const grid = document.getElementById('galeriGrid');
  grid.innerHTML = '<div class="loading-center"><i class="fa-solid fa-spinner fa-spin"></i> Memuat galeri...</div>';

  try {
    const snap = await _db.collection('galeri').orderBy('createdAt', 'desc').get();
    if (snap.empty) {
      grid.innerHTML = '<div style="text-align:center;color:#aaa;padding:40px;grid-column:1/-1">Belum ada foto. Klik "Upload Foto" untuk menambahkan.</div>';
      return;
    }
    grid.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      return `<div class="galeri-item">
        <img src="${d.url}" alt="${d.keterangan || ''}" onerror="this.style.background='#eee'">
        <div class="galeri-overlay">
          <p>${d.keterangan || 'Tanpa keterangan'}</p>
          <button class="btn-icon-white" onclick="hapusGaleri('${doc.id}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`;
    }).join('');
  } catch (err) {
    grid.innerHTML = `<div style="color:red;padding:16px;grid-column:1/-1">Error: ${err.message}</div>`;
  }
}

async function uploadGaleri() {
  const files      = document.getElementById('galeriFiles').files;
  const keterangan = document.getElementById('galeriKeterangan').value.trim();
  const btn        = document.getElementById('btnUploadGaleri');

  if (files.length === 0) { showToast('Pilih minimal 1 foto', 'error'); return; }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengupload...';

  try {
    let sukses = 0;
    for (const file of files) {
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Mengkompresi ${sukses+1}/${files.length}...`;
      const url = await imageToBase64WebP(file, 800, 0.72);
      await _db.collection('galeri').add({
        url,
        keterangan: keterangan || file.name.replace(/\.[^.]+$/, ''),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      sukses++;
    }
    showToast(`${sukses} foto berhasil disimpan`, 'success');
    document.getElementById('galeriFiles').value = '';
    document.getElementById('galeriKeterangan').value = '';
    document.getElementById('galeriUploadPreview').innerHTML = '';
    closeModalGaleri();
    loadGaleri();
  } catch (err) {
    showToast('Gagal upload: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-upload"></i> Upload Foto';
  }
}

async function hapusGaleri(id) {
  if (!confirm('Hapus foto ini?')) return;
  try {
    await _db.collection('galeri').doc(id).delete();
    showToast('Foto berhasil dihapus', 'warn');
    loadGaleri();
  } catch (err) {
    showToast('Gagal menghapus: ' + err.message, 'error');
  }
}

function openModalGaleri() {
  document.getElementById('modalGaleri').classList.add('active');
}

function closeModalGaleri() {
  document.getElementById('modalGaleri').classList.remove('active');
}

// Preview galeri sebelum upload
document.addEventListener('DOMContentLoaded', () => {
  const galeriFiles = document.getElementById('galeriFiles');
  if (galeriFiles) {
    galeriFiles.addEventListener('change', async () => {
      const preview = document.getElementById('galeriUploadPreview');
      preview.innerHTML = '<span style="font-size:11px;color:#888">Mengkompresi preview...</span>';
      let totalKb = 0;
      const imgs = await Promise.all(Array.from(galeriFiles.files).map(f => imageToBase64WebP(f, 400, 0.65)));
      preview.innerHTML = '';
      imgs.forEach(b64 => {
        totalKb += Math.round(b64.length * 0.75 / 1024);
        const img = document.createElement('img');
        img.src = b64;
        img.style.cssText = 'width:80px;height:60px;object-fit:cover;border-radius:6px;border:1px solid #ddd';
        preview.appendChild(img);
      });
      const label = document.createElement('span');
      label.style.cssText = 'font-size:11px;color:#888;align-self:center';
      label.textContent = `Total ±${totalKb} KB`;
      preview.appendChild(label);
    });
  }
});

// ──────────────────────────────────────────
// PESAN / KONTAK
// ──────────────────────────────────────────
async function loadPesan(filter = 'semua') {
  const list = document.getElementById('pesanList');
  list.innerHTML = '<tr><td colspan="5" class="loading-cell"><i class="fa-solid fa-spinner fa-spin"></i> Memuat...</td></tr>';

  try {
    const snap = await _db.collection('pesan').orderBy('createdAt', 'desc').get();
    let docs = snap.docs;
    if (filter === 'baru')   docs = docs.filter(d => !d.data().dibaca);
    if (filter === 'dibaca') docs = docs.filter(d => d.data().dibaca);

    if (docs.length === 0) {
      list.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#aaa;padding:20px">Tidak ada pesan.</td></tr>';
      return;
    }
    list.innerHTML = docs.map(doc => {
      const d = doc.data();
      return `<tr class="${!d.dibaca ? 'pesan-baru' : ''}">
        <td><strong>${d.nama || '-'}</strong><br><small style="color:#888">${d.email || ''}</small></td>
        <td>${d.subjek || '-'}</td>
        <td><span class="badge badge-${d.dibaca ? 'gray' : 'amber'}">${d.dibaca ? 'Dibaca' : 'Baru'}</span></td>
        <td>${formatDate(d.createdAt)}</td>
        <td>
          <button class="btn-icon" onclick="lihatPesan('${doc.id}')"><i class="fa-solid fa-eye"></i></button>
          <button class="btn-icon btn-danger-icon" onclick="hapusPesan('${doc.id}')"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>`;
    }).join('');
  } catch (err) {
    list.innerHTML = `<tr><td colspan="5" style="color:red;padding:16px">Error: ${err.message}</td></tr>`;
  }
}

async function lihatPesan(id) {
  const doc  = await _db.collection('pesan').doc(id).get();
  const d    = doc.data();

  document.getElementById('detailPesanNama').textContent    = d.nama || '-';
  document.getElementById('detailPesanEmail').textContent   = d.email || '-';
  document.getElementById('detailPesanTelp').textContent    = d.telepon || '-';
  document.getElementById('detailPesanSubjek').textContent  = d.subjek || '-';
  document.getElementById('detailPesanIsi').textContent     = d.pesan || '-';
  document.getElementById('detailPesanTanggal').textContent = formatDate(d.createdAt);
  document.getElementById('btnBalasPesan').href             = `mailto:${d.email}?subject=Re: ${d.subjek}`;

  document.getElementById('modalDetailPesan').classList.add('active');

  // Tandai sudah dibaca
  if (!d.dibaca) {
    await _db.collection('pesan').doc(id).update({ dibaca: true });
    loadPesan();
  }
}

function closeDetailPesan() {
  document.getElementById('modalDetailPesan').classList.remove('active');
}

async function hapusPesan(id) {
  if (!confirm('Hapus pesan ini?')) return;
  try {
    await _db.collection('pesan').doc(id).delete();
    showToast('Pesan berhasil dihapus', 'warn');
    loadPesan();
  } catch (err) {
    showToast('Gagal menghapus: ' + err.message, 'error');
  }
}

// ──────────────────────────────────────────
// FORM KONTAK PUBLIK → KIRIM KE FIRESTORE
// ──────────────────────────────────────────
async function kirimPesan() {
  const nama     = document.getElementById('kontakNama').value.trim();
  const email    = document.getElementById('kontakEmail').value.trim();
  const telepon  = document.getElementById('kontakTelepon').value.trim();
  const subjek   = document.getElementById('kontakSubjek').value.trim();
  const pesan    = document.getElementById('kontakPesan').value.trim();
  const btn      = document.getElementById('btnKirimPesan');

  if (!nama || !email || !subjek || !pesan) {
    showToast('Mohon lengkapi semua kolom wajib', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Mengirim...';

  try {
    await _db.collection('pesan').add({
      nama, email, telepon, subjek, pesan,
      dibaca: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast('Pesan berhasil terkirim! Kami akan segera menghubungi Anda.', 'success');
    document.getElementById('formKontak').reset();
  } catch (err) {
    showToast('Gagal mengirim pesan: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Kirim Pesan';
  }
}

// ──────────────────────────────────────────
// HALAMAN PUBLIK — LOAD KONTEN DINAMIS
// ──────────────────────────────────────────
async function loadPublicBerita(limit = 6) {
  try {
    const snap = await _db.collection('berita')
      .where('status', '==', 'tayang')
      .get();

    // Sort JS-side — hindari kebutuhan composite index Firestore
    const docs = snap.docs
      .sort((a, b) => (b.data().createdAt?.seconds || 0) - (a.data().createdAt?.seconds || 0))
      .slice(0, limit);

    const container = document.getElementById('publicBeritaList');
    if (!container) return;

    if (docs.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:#aaa">Belum ada berita.</p>';
      return;
    }
    container.innerHTML = docs.map(doc => {
      const d = doc.data();
      const tanggal = formatDate(d.createdAt);
      return `<div class="berita-card" onclick="lihatBeritaPublik('${doc.id}')">
        ${d.foto ? `<img src="${d.foto}" alt="${d.judul}" class="berita-img">` : '<div class="berita-no-img"><i class="fa-solid fa-newspaper"></i></div>'}
        <div class="berita-body">
          <span class="berita-kategori">${d.kategori || 'Umum'}</span>
          <h3 class="berita-judul">${d.judul}</h3>
          <p class="berita-tanggal"><i class="fa-regular fa-calendar"></i> ${tanggal}</p>
          <p class="berita-preview">${(d.isi || '').substring(0, 100)}...</p>
        </div>
      </div>`;
    }).join('');
  } catch (err) {
    console.error('loadPublicBerita error:', err);
  }
}

async function lihatBeritaPublik(id) {
  const doc = await _db.collection('berita').doc(id).get();
  const d   = doc.data();
  document.getElementById('detailBeritaJudul').textContent   = d.judul || '-';
  document.getElementById('detailBeritaTanggal').textContent = formatDate(d.createdAt);
  document.getElementById('detailBeritaKategori').textContent = d.kategori || 'Umum';
  document.getElementById('detailBeritaIsi').innerHTML       = (d.isi || '').replace(/\n/g, '<br>');
  if (d.foto) {
    document.getElementById('detailBeritaFoto').src          = d.foto;
    document.getElementById('detailBeritaFoto').style.display = 'block';
  } else {
    document.getElementById('detailBeritaFoto').style.display = 'none';
  }
  showPage('berita-detail');
}

// ──────────────────────────────────────────
// PENGATURAN WEBSITE
// ──────────────────────────────────────────

// Default values pengaturan
const SETTINGS_DEFAULT = {
  namaSekolah:    'SDN 1 Contoh',
  alamatSingkat:  'Kec. Kebon Jeruk, Jakarta',
  alamatLengkap:  'Jl. Contoh No.1, Kebon Jeruk, Jakarta Barat 11530',
  telepon:        '(021) 555-0100',
  email:          'info@sdn1contoh.sch.id',
  jamOps:         'Senin–Jumat: 07.00–14.00 WIB',
  heroBadge:      '✦ Tahun Pelajaran 2025/2026',
  heroNama:       'SDN 1 Contoh',
  heroTagline:    'Membentuk generasi cerdas, berkarakter, dan berprestasi untuk masa depan Indonesia',
  stat1Num:       '450+',
  stat1Label:     'Siswa Aktif',
  stat2Num:       '28',
  stat2Label:     'Guru & Staff',
  stat3Num:       '30+',
  stat3Label:     'Tahun Berdiri',
  npsn:           '12345678',
  akreditasi:     'A — Unggul',
  kepsek:         'Drs. Hendra Kusuma, M.Pd',
  visi:           'Menjadi sekolah dasar unggulan yang melahirkan generasi cerdas, berkarakter Pancasila, dan siap menghadapi tantangan global.',
  sejarah:        'SDN 1 Contoh berdiri sejak tahun 1990 dan telah menjadi salah satu sekolah dasar terpercaya di Kecamatan Kebon Jeruk, Jakarta Barat.',
};

// Terapkan settings ke semua elemen di halaman publik
function applySettings(s) {
  const set = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined && val !== null) el.textContent = val; };

  // Navbar & header
  set('sitNamaSekolah',   s.namaSekolah);
  set('sitAlamatSingkat', s.alamatSingkat);
  set('sitFooterNama',    s.namaSekolah);
  set('sitCopyrightNama', s.namaSekolah);
  set('sitAdminTopbar',   s.namaSekolah);
  set('sitLoginNama',     s.namaSekolah);

  // Hero teks
  set('sitHeroBadge',   s.heroBadge);
  set('sitHeroNama',    s.heroNama || s.namaSekolah); // nama aksen kuning di hero
  set('sitHeroTagline', s.heroTagline);

  // Stats
  set('sitStat1Num',   s.stat1Num);
  set('sitStat1Label', s.stat1Label);
  set('sitStat2Num',   s.stat2Num);
  set('sitStat2Label', s.stat2Label);
  set('sitStat3Num',   s.stat3Num);
  set('sitStat3Label', s.stat3Label);

  // Kontak
  const kontakTelp = document.getElementById('sitKontakTelepon');
  if (kontakTelp) kontakTelp.textContent = s.telepon || SETTINGS_DEFAULT.telepon;
  const kontakEmail = document.getElementById('sitKontakEmail');
  if (kontakEmail) kontakEmail.textContent = s.email || SETTINGS_DEFAULT.email;
  const kontakAlamat = document.getElementById('sitKontakAlamat');
  if (kontakAlamat) kontakAlamat.textContent = s.alamatLengkap || SETTINGS_DEFAULT.alamatLengkap;
  const kontakJam = document.getElementById('sitKontakJam');
  if (kontakJam) kontakJam.textContent = s.jamOps || SETTINGS_DEFAULT.jamOps;

  // Topbar info
  const topbarJam = document.getElementById('sitKontakJam2');
  if (topbarJam) topbarJam.textContent = s.jamOps || SETTINGS_DEFAULT.jamOps;
  const topbarTelp = document.getElementById('sitKontakTelp2');
  if (topbarTelp) topbarTelp.textContent = s.telepon || SETTINGS_DEFAULT.telepon;

  // Footer kontak
  const footerTelp = document.getElementById('sitFooterTelp');
  if (footerTelp) footerTelp.textContent = s.telepon || SETTINGS_DEFAULT.telepon;
  const footerEmail = document.getElementById('sitFooterEmail');
  if (footerEmail) footerEmail.textContent = s.email || SETTINGS_DEFAULT.email;

  // Profil sekolah
  const profilNama    = document.getElementById('sitProfilNama');    if (profilNama) profilNama.textContent = s.namaSekolah;
  const profilNPSN    = document.getElementById('sitProfilNPSN');    if (profilNPSN) profilNPSN.textContent = s.npsn || SETTINGS_DEFAULT.npsn;
  const profilAkred   = document.getElementById('sitProfilAkred');   if (profilAkred) profilAkred.textContent = s.akreditasi || SETTINGS_DEFAULT.akreditasi;
  const profilKepsek  = document.getElementById('sitProfilKepsek');  if (profilKepsek) profilKepsek.textContent = s.kepsek || SETTINGS_DEFAULT.kepsek;
  const profilAlamat  = document.getElementById('sitProfilAlamat');  if (profilAlamat) profilAlamat.textContent = s.alamatLengkap || SETTINGS_DEFAULT.alamatLengkap;
  const profilVisi    = document.getElementById('sitProfilVisi');    if (profilVisi) profilVisi.textContent = s.visi || SETTINGS_DEFAULT.visi;
  const profilSejarah1 = document.getElementById('sitProfilSejarah1'); if (profilSejarah1) profilSejarah1.textContent = s.sejarah || SETTINGS_DEFAULT.sejarah;
  const profilSejarah1About = document.getElementById('sitProfilSejarah1About'); if (profilSejarah1About) profilSejarah1About.textContent = s.sejarah || SETTINGS_DEFAULT.sejarah;

  // Akreditasi di hero card
  if (s.akreditasi) {
    const letter = document.getElementById('sitAcredLetter');
    if (letter) letter.textContent = (s.akreditasi || 'A')[0].toUpperCase();
    const sub = document.getElementById('sitProfilAkred2');
    if (sub) sub.textContent = s.akreditasi;
  }

  // Foto Hero (gambar kanan)
  const heroFotoImg = document.getElementById('heroFotoImg');
  if (heroFotoImg) {
    if (s.heroFotoBase64) {
      heroFotoImg.src = s.heroFotoBase64;
    }
    // else biarkan default URL
  }

  // Background Hero
  const heroSection = document.getElementById('heroSection');
  if (heroSection) {
    if (s.heroBgBase64) {
      heroSection.style.background =
        `linear-gradient(to right, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.80) 55%, rgba(232,240,252,0.85) 100%), url('${s.heroBgBase64}') center/cover no-repeat`;
    }
    // else biarkan default CSS
  }

  // Title halaman browser
  document.title = (s.namaSekolah || 'SDN 1 Contoh') + ' — Website Resmi';
}

// Muat pengaturan dari Firestore, terapkan ke halaman
async function loadAndApplySettings() {
  try {
    const doc = await _db.collection('settings').doc('main').get();
    const data = doc.exists ? { ...SETTINGS_DEFAULT, ...doc.data() } : SETTINGS_DEFAULT;
    applySettings(data);
  } catch (err) {
    // Kalau gagal, pakai default
    applySettings(SETTINGS_DEFAULT);
    console.warn('loadSettings error:', err.message);
  }
}

// Isi form pengaturan dengan data dari Firestore
async function loadPengaturan() {
  try {
    const doc  = await _db.collection('settings').doc('main').get();
    const data = doc.exists ? { ...SETTINGS_DEFAULT, ...doc.data() } : SETTINGS_DEFAULT;

    const fill = (id, key) => { const el = document.getElementById(id); if (el) el.value = data[key] || ''; };
    fill('setPNamaSekolah',  'namaSekolah');
    fill('setPAlamatSingkat','alamatSingkat');
    fill('setpAlamatLengkap','alamatLengkap');
    fill('setpTelepon',      'telepon');
    fill('setpEmail',        'email');
    fill('setPJamOps',       'jamOps');
    fill('setPHeroBadge',    'heroBadge');
    fill('setPHeroNama',     'heroNama');
    fill('setPHeroTagline',  'heroTagline');
    fill('setPStat1Num',     'stat1Num');
    fill('setPStat1Label',   'stat1Label');
    fill('setPStat2Num',     'stat2Num');
    fill('setPStat2Label',   'stat2Label');
    fill('setPStat3Num',     'stat3Num');
    fill('setPStat3Label',   'stat3Label');
    fill('setPNPSN',         'npsn');
    fill('setPAkreditasi',   'akreditasi');
    fill('setPKepsek',       'kepsek');
    fill('setPVisi',         'visi');
    fill('setPSejarah',      'sejarah');

    // Tampilkan preview foto hero kalau sudah ada
    _showHeroFotoPreview(data.heroFotoBase64 || null);
    _showHeroBgPreview(data.heroBgBase64 || null);

    showToast('Data pengaturan dimuat', 'info');
  } catch (err) {
    showToast('Gagal memuat pengaturan: ' + err.message, 'error');
  }
}

// Simpan pengaturan ke Firestore
async function simpanPengaturan() {
  const get = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };

  const payload = {
    namaSekolah:   get('setPNamaSekolah'),
    alamatSingkat: get('setPAlamatSingkat'),
    alamatLengkap: get('setpAlamatLengkap'),
    telepon:       get('setpTelepon'),
    email:         get('setpEmail'),
    jamOps:        get('setPJamOps'),
    heroBadge:     get('setPHeroBadge'),
    heroNama:      get('setPHeroNama'),
    heroTagline:   get('setPHeroTagline'),
    stat1Num:      get('setPStat1Num'),
    stat1Label:    get('setPStat1Label'),
    stat2Num:      get('setPStat2Num'),
    stat2Label:    get('setPStat2Label'),
    stat3Num:      get('setPStat3Num'),
    stat3Label:    get('setPStat3Label'),
    npsn:          get('setPNPSN'),
    akreditasi:    get('setPAkreditasi'),
    kepsek:        get('setPKepsek'),
    visi:          get('setPVisi'),
    sejarah:       get('setPSejarah'),
    updatedAt:     firebase.firestore.FieldValue.serverTimestamp(),
  };

  if (!payload.namaSekolah) { showToast('Nama sekolah tidak boleh kosong', 'error'); return; }

  // Proses foto hero jika ada file baru
  const fotoFile = document.getElementById('setPHeroFotoFile')?.files[0];
  const bgFile   = document.getElementById('setPHeroBgFile')?.files[0];

  const btnSave = document.querySelector('#section-pengaturan .btn-primary');
  if (btnSave) { btnSave.disabled = true; btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...'; }

  try {
    // Kompresi & encode foto hero (maks 1200px wide)
    if (fotoFile) {
      const statusEl = document.getElementById('setPHeroFotoStatus');
      if (statusEl) statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengompres foto hero...';
      payload.heroFotoBase64 = await imageToBase64WebP(fotoFile, 1200, 0.78);
      if (statusEl) statusEl.innerHTML = `<span style="color:var(--green)"><i class="fa-solid fa-check"></i> Selesai (${Math.round(payload.heroFotoBase64.length / 1024)} KB)</span>`;
    }

    // Kompresi & encode background hero (maks 1800px wide, kualitas lebih rendah)
    if (bgFile) {
      const statusEl = document.getElementById('setPHeroBgStatus');
      if (statusEl) statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengompres background hero...';
      payload.heroBgBase64 = await imageToBase64WebP(bgFile, 1800, 0.65);
      if (statusEl) statusEl.innerHTML = `<span style="color:var(--green)"><i class="fa-solid fa-check"></i> Selesai (${Math.round(payload.heroBgBase64.length / 1024)} KB)</span>`;
    }

    await _db.collection('settings').doc('main').set(payload, { merge: true });
    showToast('✅ Pengaturan berhasil disimpan!', 'success');

    // Reset file input
    if (document.getElementById('setPHeroFotoFile')) document.getElementById('setPHeroFotoFile').value = '';
    if (document.getElementById('setPHeroBgFile'))   document.getElementById('setPHeroBgFile').value = '';

    // Langsung terapkan ke halaman tanpa reload
    // Ambil data lengkap (termasuk foto lama yang tidak diubah)
    const existingDoc = await _db.collection('settings').doc('main').get();
    const finalData = { ...SETTINGS_DEFAULT, ...existingDoc.data() };
    applySettings(finalData);

  } catch (err) {
    showToast('Gagal menyimpan: ' + err.message, 'error');
    console.error(err);
  } finally {
    if (btnSave) { btnSave.disabled = false; btnSave.innerHTML = '<i class="fa-solid fa-save"></i> Simpan Semua Perubahan'; }
  }
}
// ──────────────────────────────────────────
// HELPER: PREVIEW & HAPUS FOTO HERO / BG
// ──────────────────────────────────────────

function _showHeroFotoPreview(src) {
  const img   = document.getElementById('setPHeroFotoPreview');
  const empty = document.getElementById('setPHeroFotoEmpty');
  const hapus = document.getElementById('btnHapusHeroFoto');
  if (!img) return;
  if (src) {
    img.src = src; img.style.display = 'block';
    if (empty) empty.style.display = 'none';
    if (hapus) hapus.style.display = 'inline-flex';
  } else {
    img.style.display = 'none';
    if (empty) empty.style.display = 'flex';
    if (hapus) hapus.style.display = 'none';
  }
}

function _showHeroBgPreview(src) {
  const img   = document.getElementById('setPHeroBgPreview');
  const empty = document.getElementById('setPHeroBgEmpty');
  const hapus = document.getElementById('btnHapusHeroBg');
  if (!img) return;
  if (src) {
    img.src = src; img.style.display = 'block';
    if (empty) empty.style.display = 'none';
    if (hapus) hapus.style.display = 'inline-flex';
  } else {
    img.style.display = 'none';
    if (empty) empty.style.display = 'flex';
    if (hapus) hapus.style.display = 'none';
  }
}

async function previewHeroFoto(input) {
  if (!input.files[0]) return;
  const statusEl = document.getElementById('setPHeroFotoStatus');
  if (statusEl) statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Membaca file...';
  try {
    const b64 = await imageToBase64WebP(input.files[0], 1200, 0.78);
    _showHeroFotoPreview(b64);
    if (statusEl) statusEl.innerHTML = `<span style="color:var(--green)"><i class="fa-solid fa-check"></i> Siap diunggah (${Math.round(b64.length / 1024)} KB setelah kompresi)</span>`;
  } catch(e) {
    if (statusEl) statusEl.innerHTML = '<span style="color:var(--red)">Gagal membaca gambar</span>';
  }
}

async function previewHeroBg(input) {
  if (!input.files[0]) return;
  const statusEl = document.getElementById('setPHeroBgStatus');
  if (statusEl) statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Membaca file...';
  try {
    const b64 = await imageToBase64WebP(input.files[0], 1800, 0.65);
    _showHeroBgPreview(b64);
    if (statusEl) statusEl.innerHTML = `<span style="color:var(--green)"><i class="fa-solid fa-check"></i> Siap diunggah (${Math.round(b64.length / 1024)} KB setelah kompresi)</span>`;
  } catch(e) {
    if (statusEl) statusEl.innerHTML = '<span style="color:var(--red)">Gagal membaca gambar</span>';
  }
}

async function hapusHeroFoto() {
  if (!confirm('Hapus foto hero? Tampilan akan kembali ke foto default.')) return;
  try {
    await _db.collection('settings').doc('main').update({ heroFotoBase64: firebase.firestore.FieldValue.delete() });
    _showHeroFotoPreview(null);
    const heroFotoImg = document.getElementById('heroFotoImg');
    if (heroFotoImg) heroFotoImg.src = 'https://images.unsplash.com/photo-1513258496099-48168024aec0?q=80&w=1200&auto=format&fit=crop';
    showToast('Foto hero berhasil dihapus', 'success');
  } catch(e) {
    showToast('Gagal menghapus foto: ' + e.message, 'error');
  }
}

async function hapusHeroBg() {
  if (!confirm('Hapus background hero? Tampilan akan kembali ke background default.')) return;
  try {
    await _db.collection('settings').doc('main').update({ heroBgBase64: firebase.firestore.FieldValue.delete() });
    _showHeroBgPreview(null);
    const heroSection = document.getElementById('heroSection');
    if (heroSection) {
      heroSection.style.background =
        "linear-gradient(to right, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.80) 55%, rgba(232,240,252,0.85) 100%), url('https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1800&auto=format&fit=crop') center/cover no-repeat";
    }
    showToast('Background hero berhasil dihapus', 'success');
  } catch(e) {
    showToast('Gagal menghapus background: ' + e.message, 'error');
  }
}
