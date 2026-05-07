// ============================================================
// config.js — Konfigurasi Supabase
// Isi SUPABASE_URL dan SUPABASE_ANON_KEY dari:
//   Supabase Dashboard > Project Settings > API
// ============================================================

const SUPABASE_URL  = 'https://owpkcyvfshytmcfstzjo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93cGtjeXZmc2h5dG1jZnN0empvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMzE3MDYsImV4cCI6MjA5MzcwNzcwNn0.s335C493rWUsTYG5e27E91VjC0uw_SU2SSkgIYoDZ-U';

// Inisialisasi Supabase client (menggunakan CDN global window.supabase)
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export supaya bisa dipakai di file lain
window._sb = sb;
