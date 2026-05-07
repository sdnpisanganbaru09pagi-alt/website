// ============================================================
// admin.js — CRUD Berita, Pengumuman, Agenda via Supabase
// ============================================================

// ─── STATE ───────────────────────────────────────────────────
let _editId   = { berita: null, pengumuman: null, agenda: null };
let _page     = { berita: 1 };
const PAGE_SIZE = 10;

// ─── HELPERS ─────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function setLoading(tbodyId, cols) {
  const el = document.getElementById(tbodyId);
  if (el) el.innerHTML = `<tr><td colspan="${cols}" style="text-align:center;padding:28px;color:var(--gray)"><i class="fa-solid fa-spinner fa-spin"></i> Memuat data...</td></tr>`;
}

function setError(tbodyId, cols, msg) {
  const el = document.getElementById(tbodyId);
  if (el) el.innerHTML = `<tr><td colspan="${cols}" style="text-align:center;padding:28px;color:var(--red)">${msg}</td></tr>`;
}

function setEmpty(tbodyId, cols, msg) {
  const el = document.getElementById(tbodyId);
  if (el) el.innerHTML = `<tr><td colspan="${cols}" style="text-align:center;padding:28px;color:var(--gray)">${msg}</td></tr>`;
}

// ─── DASHBOARD STATS ─────────────────────────────────────────
async function loadDashboardStats() {
  const [beritaRes, pengumumanRes, agendaRes] = await Promise.all([
    _sb.from('berita').select('*', { count: 'exact', head: true }),
    _sb.from('pengumuman').select('*', { count: 'exact', head: true }).eq('status', 'aktif'),
    _sb.from('agenda').select('*', { count: 'exact', head: true }),
  ]);

  const beritaCount = beritaRes.count ?? '—';
  const pengumumanCount = pengumumanRes.count ?? '—';
  const agendaCount = agendaRes.count ?? '—';

  const elBerita = document.getElementById('statBerita');
  const elPengumuman = document.getElementById('statPengumuman');
  const elAgenda = document.getElementById('statAgenda');
  if (elBerita) elBerita.textContent = beritaCount;
  if (elPengumuman) elPengumuman.textContent = pengumumanCount;
  if (elAgenda) elAgenda.textContent = agendaCount;

  // Activity feed — 5 item terbaru dari semua tabel
  loadRecentActivity();
}

async function loadRecentActivity() {
  const [b, p, a] = await Promise.all([
    _sb.from('berita').select('judul, created_at').order('created_at', { ascending: false }).limit(3),
    _sb.from('pengumuman').select('judul, created_at').order('created_at', { ascending: false }).limit(2),
    _sb.from('agenda').select('nama, created_at').order('created_at', { ascending: false }).limit(2),
  ]);

  const items = [
    ...(b.data || []).map(x => ({ label: `Berita "${x.judul}" ditambahkan`, time: x.created_at, color: 'var(--blue)' })),
    ...(p.data || []).map(x => ({ label: `Pengumuman "${x.judul}" ditambahkan`, time: x.created_at, color: 'var(--accent)' })),
    ...(a.data || []).map(x => ({ label: `Agenda "${x.nama}" ditambahkan`, time: x.created_at, color: 'var(--green)' })),
  ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 6);

  const feed = document.getElementById('activityFeed');
  if (!feed) return;
  if (!items.length) {
    feed.innerHTML = '<div style="color:var(--gray);font-size:13px;padding:12px 0">Belum ada aktivitas.</div>';
    return;
  }
  feed.innerHTML = items.map(i => `
    <div class="activity-item">
      <div class="act-dot" style="background:${i.color}"></div>
      <div class="act-text">${i.label}</div>
      <div class="act-time">${fmtDate(i.time)}</div>
    </div>`).join('');
}

// ─── BERITA ───────────────────────────────────────────────────
async function loadBerita(page = 1, search = '', kategori = '') {
  _page.berita = page;
  setLoading('beritaBody', 5);

  let q = _sb.from('berita').select('*', { count: 'exact' });
  if (search) q = q.ilike('judul', `%${search}%`);
  if (kategori) q = q.eq('kategori', kategori);
  q = q.order('created_at', { ascending: false })
       .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const { data, error, count } = await q;
  if (error) return setError('beritaBody', 5, 'Gagal memuat berita: ' + error.message);
  if (!data.length) return setEmpty('beritaBody', 5, 'Belum ada berita.');

  document.getElementById('beritaBody').innerHTML = data.map(b => `
    <tr>
      <td><div style="font-weight:600;font-size:14px">${b.judul}</div></td>
      <td><span class="pill pill-blue">${b.kategori}</span></td>
      <td style="color:var(--gray);font-size:13px">${fmtDate(b.created_at)}</td>
      <td><span class="pill ${b.status === 'published' ? 'pill-green' : 'pill-amber'}">${b.status === 'published' ? 'Publik' : 'Draft'}</span></td>
      <td><div class="action-btns">
        <button class="icon-btn edit" onclick="openEditBerita('${b.id}')"><i class="fa-solid fa-pen"></i></button>
        <button class="icon-btn del"  onclick="deleteBerita('${b.id}', this)"><i class="fa-solid fa-trash"></i></button>
      </div></td>
    </tr>`).join('');

  renderPagination('beritaPagination', count, page, (p) => loadBerita(p, search, kategori));
}

async function saveBerita() {
  const id     = _editId.berita;
  const judul  = document.getElementById('bJudul').value.trim();
  const isi    = document.getElementById('bIsi').innerText.trim();
  const kat    = document.getElementById('bKategori').value;
  const status = document.getElementById('bStatus').value;

  if (!judul) return showToast('Judul berita wajib diisi', 'error');

  const payload = { judul, isi, kategori: kat, status };
  const { error } = id
    ? await _sb.from('berita').update(payload).eq('id', id)
    : await _sb.from('berita').insert(payload);

  if (error) return showToast('Gagal menyimpan: ' + error.message, 'error');

  closeModal('beritaModal');
  showToast(id ? 'Berita berhasil diperbarui!' : 'Berita berhasil dipublikasikan!', '');
  loadBerita(_page.berita);
  loadDashboardStats();
  _editId.berita = null;
}

async function openEditBerita(id) {
  const { data, error } = await _sb.from('berita').select('*').eq('id', id).single();
  if (error) return showToast('Gagal memuat data', 'error');

  _editId.berita = id;
  document.getElementById('beritaModalTitle').textContent = 'Edit Berita';
  document.getElementById('bJudul').value = data.judul;
  document.getElementById('bIsi').innerText = data.isi || '';
  document.getElementById('bKategori').value = data.kategori;
  document.getElementById('bStatus').value = data.status;
  openModal('beritaModal');
}

async function deleteBerita(id, btn) {
  if (!confirm('Hapus berita ini?')) return;
  btn.disabled = true;
  const { error } = await _sb.from('berita').delete().eq('id', id);
  if (error) { showToast('Gagal menghapus: ' + error.message, 'error'); btn.disabled = false; return; }
  showToast('Berita dihapus', 'error');
  loadBerita(_page.berita);
  loadDashboardStats();
}

function openNewBerita() {
  _editId.berita = null;
  document.getElementById('beritaModalTitle').textContent = 'Tambah Berita Baru';
  document.getElementById('bJudul').value = '';
  document.getElementById('bIsi').innerText = '';
  document.getElementById('bKategori').value = 'Umum';
  document.getElementById('bStatus').value = 'draft';
  openModal('beritaModal');
}

// ─── PENGUMUMAN ───────────────────────────────────────────────
async function loadPengumuman(search = '') {
  setLoading('pengumumanBody', 5);

  let q = _sb.from('pengumuman').select('*').order('created_at', { ascending: false });
  if (search) q = q.ilike('judul', `%${search}%`);

  const { data, error } = await q;
  if (error) return setError('pengumumanBody', 5, 'Gagal memuat: ' + error.message);
  if (!data.length) return setEmpty('pengumumanBody', 5, 'Belum ada pengumuman.');

  document.getElementById('pengumumanBody').innerHTML = data.map(p => `
    <tr>
      <td><div style="font-weight:600;font-size:14px">${p.judul}</div></td>
      <td><span class="pill ${p.prioritas === 'Mendesak' ? 'pill-red' : p.prioritas === 'Penting' ? 'pill-amber' : 'pill-blue'}">${p.prioritas}</span></td>
      <td style="color:var(--gray);font-size:13px">${fmtDate(p.tanggal_mulai)}${p.tanggal_selesai ? ' – ' + fmtDate(p.tanggal_selesai) : ''}</td>
      <td><span class="pill ${p.status === 'aktif' ? 'pill-green' : 'pill-amber'}">${p.status}</span></td>
      <td><div class="action-btns">
        <button class="icon-btn edit" onclick="openEditPengumuman('${p.id}')"><i class="fa-solid fa-pen"></i></button>
        <button class="icon-btn del"  onclick="deletePengumuman('${p.id}', this)"><i class="fa-solid fa-trash"></i></button>
      </div></td>
    </tr>`).join('');
}

async function savePengumuman() {
  const id      = _editId.pengumuman;
  const judul   = document.getElementById('pJudul').value.trim();
  const isi     = document.getElementById('pIsi').value.trim();
  const prior   = document.getElementById('pPrioritas').value;
  const tMulai  = document.getElementById('pTanggalMulai').value || null;
  const tSelesai= document.getElementById('pTanggalSelesai').value || null;
  const status  = document.getElementById('pStatus').value;

  if (!judul) return showToast('Judul pengumuman wajib diisi', 'error');

  const payload = { judul, isi, prioritas: prior, tanggal_mulai: tMulai, tanggal_selesai: tSelesai, status };
  const { error } = id
    ? await _sb.from('pengumuman').update(payload).eq('id', id)
    : await _sb.from('pengumuman').insert(payload);

  if (error) return showToast('Gagal menyimpan: ' + error.message, 'error');
  closeModal('pengumumanModal');
  showToast(id ? 'Pengumuman diperbarui!' : 'Pengumuman berhasil ditambahkan!', '');
  loadPengumuman();
  loadDashboardStats();
  _editId.pengumuman = null;
}

async function openEditPengumuman(id) {
  const { data, error } = await _sb.from('pengumuman').select('*').eq('id', id).single();
  if (error) return showToast('Gagal memuat data', 'error');

  _editId.pengumuman = id;
  document.getElementById('pengumumanModalTitle').textContent = 'Edit Pengumuman';
  document.getElementById('pJudul').value = data.judul;
  document.getElementById('pIsi').value = data.isi || '';
  document.getElementById('pPrioritas').value = data.prioritas;
  document.getElementById('pTanggalMulai').value = data.tanggal_mulai || '';
  document.getElementById('pTanggalSelesai').value = data.tanggal_selesai || '';
  document.getElementById('pStatus').value = data.status;
  openModal('pengumumanModal');
}

async function deletePengumuman(id, btn) {
  if (!confirm('Hapus pengumuman ini?')) return;
  btn.disabled = true;
  const { error } = await _sb.from('pengumuman').delete().eq('id', id);
  if (error) { showToast('Gagal menghapus', 'error'); btn.disabled = false; return; }
  showToast('Pengumuman dihapus', 'error');
  loadPengumuman();
  loadDashboardStats();
}

function openNewPengumuman() {
  _editId.pengumuman = null;
  document.getElementById('pengumumanModalTitle').textContent = 'Tambah Pengumuman';
  document.getElementById('pJudul').value = '';
  document.getElementById('pIsi').value = '';
  document.getElementById('pPrioritas').value = 'Normal';
  document.getElementById('pTanggalMulai').value = '';
  document.getElementById('pTanggalSelesai').value = '';
  document.getElementById('pStatus').value = 'aktif';
  openModal('pengumumanModal');
}

// ─── AGENDA ───────────────────────────────────────────────────
async function loadAgenda(search = '') {
  setLoading('agendaBody', 5);

  let q = _sb.from('agenda').select('*').order('tanggal_mulai', { ascending: true });
  if (search) q = q.ilike('nama', `%${search}%`);

  const { data, error } = await q;
  if (error) return setError('agendaBody', 5, 'Gagal memuat: ' + error.message);
  if (!data.length) return setEmpty('agendaBody', 5, 'Belum ada agenda.');

  document.getElementById('agendaBody').innerHTML = data.map(a => `
    <tr>
      <td><div style="font-weight:600;font-size:14px">${a.nama}</div></td>
      <td style="color:var(--gray);font-size:13px">${fmtDate(a.tanggal_mulai)}${a.tanggal_selesai ? ' – ' + fmtDate(a.tanggal_selesai) : ''}</td>
      <td style="font-size:13px">${a.lokasi || '—'}</td>
      <td><span class="pill ${a.status === 'aktif' ? 'pill-green' : a.status === 'mendatang' ? 'pill-blue' : 'pill-amber'}">${a.status}</span></td>
      <td><div class="action-btns">
        <button class="icon-btn edit" onclick="openEditAgenda('${a.id}')"><i class="fa-solid fa-pen"></i></button>
        <button class="icon-btn del"  onclick="deleteAgenda('${a.id}', this)"><i class="fa-solid fa-trash"></i></button>
      </div></td>
    </tr>`).join('');
}

async function saveAgenda() {
  const id       = _editId.agenda;
  const nama     = document.getElementById('aNama').value.trim();
  const tMulai   = document.getElementById('aTanggalMulai').value || null;
  const tSelesai = document.getElementById('aTanggalSelesai').value || null;
  const lokasi   = document.getElementById('aLokasi').value.trim();
  const pj       = document.getElementById('aPJ').value.trim();
  const ket      = document.getElementById('aKeterangan').value.trim();
  const status   = document.getElementById('aStatus').value;

  if (!nama) return showToast('Nama kegiatan wajib diisi', 'error');
  if (!tMulai) return showToast('Tanggal mulai wajib diisi', 'error');

  const payload = { nama, tanggal_mulai: tMulai, tanggal_selesai: tSelesai, lokasi, penanggung_jawab: pj, keterangan: ket, status };
  const { error } = id
    ? await _sb.from('agenda').update(payload).eq('id', id)
    : await _sb.from('agenda').insert(payload);

  if (error) return showToast('Gagal menyimpan: ' + error.message, 'error');
  closeModal('agendaModal');
  showToast(id ? 'Agenda diperbarui!' : 'Agenda berhasil ditambahkan!', '');
  loadAgenda();
  loadDashboardStats();
  _editId.agenda = null;
}

async function openEditAgenda(id) {
  const { data, error } = await _sb.from('agenda').select('*').eq('id', id).single();
  if (error) return showToast('Gagal memuat data', 'error');

  _editId.agenda = id;
  document.getElementById('agendaModalTitle').textContent = 'Edit Agenda';
  document.getElementById('aNama').value = data.nama;
  document.getElementById('aTanggalMulai').value = data.tanggal_mulai || '';
  document.getElementById('aTanggalSelesai').value = data.tanggal_selesai || '';
  document.getElementById('aLokasi').value = data.lokasi || '';
  document.getElementById('aPJ').value = data.penanggung_jawab || '';
  document.getElementById('aKeterangan').value = data.keterangan || '';
  document.getElementById('aStatus').value = data.status;
  openModal('agendaModal');
}

async function deleteAgenda(id, btn) {
  if (!confirm('Hapus agenda ini?')) return;
  btn.disabled = true;
  const { error } = await _sb.from('agenda').delete().eq('id', id);
  if (error) { showToast('Gagal menghapus', 'error'); btn.disabled = false; return; }
  showToast('Agenda dihapus', 'error');
  loadAgenda();
  loadDashboardStats();
}

function openNewAgenda() {
  _editId.agenda = null;
  document.getElementById('agendaModalTitle').textContent = 'Tambah Agenda';
  ['aNama','aTanggalMulai','aTanggalSelesai','aLokasi','aPJ','aKeterangan'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const aStatus = document.getElementById('aStatus');
  if (aStatus) aStatus.value = 'mendatang';
  openModal('agendaModal');
}

// ─── SEARCH (debounced) ───────────────────────────────────────
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ─── PAGINATION ───────────────────────────────────────────────
function renderPagination(containerId, total, current, onPage) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const from = (current - 1) * PAGE_SIZE + 1;
  const to   = Math.min(current * PAGE_SIZE, total);

  let btns = '';
  for (let i = 1; i <= totalPages; i++) {
    btns += `<div class="page-btn ${i === current ? 'active' : ''}" onclick="(${onPage.toString()})(${i})">${i}</div>`;
  }

  el.innerHTML = `
    <span class="pagination-info">Menampilkan ${from}–${to} dari ${total} data</span>
    <div class="page-btns">${btns}</div>`;
}

// ─── DIPANGGIL SAAT SWITCH VIEW ───────────────────────────────
function initTables() {
  const view = document.querySelector('[id^="view-"][style*="block"]');
  if (!view) return;
  const name = view.id.replace('view-', '');
  if (name === 'dashboard') loadDashboardStats();
  else if (name === 'berita') loadBerita();
  else if (name === 'pengumuman') loadPengumuman();
  else if (name === 'agenda') loadAgenda();
}

// ─── SEARCH HANDLERS (dipasang ke elemen di HTML) ─────────────
window.onBeritaSearch = debounce((val) => {
  const kat = document.getElementById('beritaKategoriFilter')?.value || '';
  loadBerita(1, val, kat);
}, 400);

window.onPengumumanSearch = debounce((val) => loadPengumuman(val), 400);
window.onAgendaSearch = debounce((val) => loadAgenda(val), 400);
