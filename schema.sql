-- ============================================================
-- SCHEMA SUPABASE — SMA Nusantara Bangsa Admin Panel
-- Jalankan file ini di: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: berita
-- ============================================================
CREATE TABLE IF NOT EXISTS public.berita (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  judul       TEXT NOT NULL,
  isi         TEXT,
  kategori    TEXT NOT NULL DEFAULT 'Umum',
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  dibuat_oleh UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: pengumuman
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pengumuman (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  judul         TEXT NOT NULL,
  isi           TEXT,
  prioritas     TEXT NOT NULL DEFAULT 'Normal' CHECK (prioritas IN ('Normal', 'Penting', 'Mendesak')),
  tanggal_mulai DATE,
  tanggal_selesai DATE,
  status        TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif')),
  dibuat_oleh   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: agenda
-- ============================================================
CREATE TABLE IF NOT EXISTS public.agenda (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nama            TEXT NOT NULL,
  tanggal_mulai   DATE NOT NULL,
  tanggal_selesai DATE,
  lokasi          TEXT,
  penanggung_jawab TEXT,
  keterangan      TEXT,
  status          TEXT NOT NULL DEFAULT 'mendatang' CHECK (status IN ('aktif', 'mendatang', 'selesai')),
  dibuat_oleh     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: ppdb_pendaftar
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ppdb_pendaftar (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nama_lengkap    TEXT NOT NULL,
  tanggal_lahir   DATE NOT NULL,
  jenis_kelamin   TEXT NOT NULL CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
  asal_sekolah    TEXT NOT NULL,
  jurusan         TEXT NOT NULL,
  jalur_masuk     TEXT NOT NULL,
  no_hp_ortu      TEXT NOT NULL,
  email           TEXT NOT NULL,
  alamat          TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu', 'diterima', 'ditolak')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profil_sekolah (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nama_sekolah      TEXT NOT NULL DEFAULT 'SMA Nusantara Bangsa',
  npsn              TEXT DEFAULT '',
  kepala_sekolah    TEXT DEFAULT '',
  akreditasi        TEXT DEFAULT 'A (Unggul)',
  alamat            TEXT DEFAULT '',
  telepon           TEXT DEFAULT '',
  email             TEXT DEFAULT '',
  visi              TEXT DEFAULT '',
  misi              TEXT DEFAULT '',
  sambutan_nama     TEXT DEFAULT '',
  sambutan_jabatan  TEXT DEFAULT '',
  sambutan_teks     TEXT DEFAULT '',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUTO-UPDATE updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_berita_updated
  BEFORE UPDATE ON public.berita
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_pengumuman_updated
  BEFORE UPDATE ON public.pengumuman
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_agenda_updated
  BEFORE UPDATE ON public.agenda
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_ppdb_pendaftar_updated
  BEFORE UPDATE ON public.ppdb_pendaftar
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER on_profil_sekolah_updated
  BEFORE UPDATE ON public.profil_sekolah
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Publik bisa baca, hanya user login yang bisa tulis
-- ============================================================
ALTER TABLE public.berita      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengumuman  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ppdb_pendaftar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profil_sekolah ENABLE ROW LEVEL SECURITY;

-- BERITA: siapa pun bisa baca yg published
CREATE POLICY "berita_select_public"  ON public.berita  FOR SELECT USING (status = 'published' OR auth.role() = 'authenticated');
CREATE POLICY "berita_insert_admin"   ON public.berita  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "berita_update_admin"   ON public.berita  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "berita_delete_admin"   ON public.berita  FOR DELETE USING (auth.role() = 'authenticated');

-- PENGUMUMAN: siapa pun bisa baca yg aktif
CREATE POLICY "pengumuman_select_public"  ON public.pengumuman  FOR SELECT USING (status = 'aktif' OR auth.role() = 'authenticated');
CREATE POLICY "pengumuman_insert_admin"   ON public.pengumuman  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "pengumuman_update_admin"   ON public.pengumuman  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "pengumuman_delete_admin"   ON public.pengumuman  FOR DELETE USING (auth.role() = 'authenticated');

-- AGENDA: siapa pun bisa baca
CREATE POLICY "agenda_select_public"  ON public.agenda  FOR SELECT USING (true);
CREATE POLICY "agenda_insert_admin"   ON public.agenda  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "agenda_update_admin"   ON public.agenda  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "agenda_delete_admin"   ON public.agenda  FOR DELETE USING (auth.role() = 'authenticated');

-- PPDB: publik bisa mendaftar, admin bisa kelola penuh
CREATE POLICY "ppdb_insert_public"  ON public.ppdb_pendaftar FOR INSERT WITH CHECK (true);
CREATE POLICY "ppdb_select_admin"   ON public.ppdb_pendaftar FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "ppdb_update_admin"   ON public.ppdb_pendaftar FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "ppdb_delete_admin"   ON public.ppdb_pendaftar FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "profil_select_public" ON public.profil_sekolah FOR SELECT USING (true);
CREATE POLICY "profil_write_admin"   ON public.profil_sekolah FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- SEED DATA (opsional — hapus kalau tidak perlu)
-- ============================================================
-- Jalankan bagian ini SETELAH membuat akun admin pertama kali
-- lewat Supabase Auth > Users > Add User, lalu uncomment:

-- INSERT INTO public.berita (judul, isi, kategori, status) VALUES
--   ('Juara OSN Matematika Provinsi 2025', 'Siswa SMA Nusantara berhasil meraih juara...', 'Prestasi', 'published'),
--   ('Pekan Seni & Budaya 2025 Dibuka Meriah', 'Ratusan siswa tampil memukau...', 'Kegiatan', 'published'),
--   ('100% Lulusan 2024 Masuk PTN', 'Pencapaian luar biasa ini...', 'Akademik', 'published');

-- INSERT INTO public.pengumuman (judul, isi, prioritas, tanggal_mulai, tanggal_selesai, status) VALUES
--   ('PPDB 2025/2026 Resmi Dibuka', 'Penerimaan Peserta Didik Baru...', 'Mendesak', '2025-01-01', '2025-03-30', 'aktif'),
--   ('UTS Semester Genap 2024/2025', 'UTS dilaksanakan pada...', 'Penting', '2025-02-20', '2025-02-27', 'aktif');

-- INSERT INTO public.agenda (nama, tanggal_mulai, tanggal_selesai, lokasi, status) VALUES
--   ('PPDB Jalur Prestasi', '2025-02-01', '2025-02-15', 'Online', 'aktif'),
--   ('UTS Semester Genap', '2025-02-20', '2025-02-27', 'Sekolah', 'mendatang');
