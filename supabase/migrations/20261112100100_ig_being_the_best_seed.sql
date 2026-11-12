-- ============================================================================
-- Being the Best: isi awal dari data/timeline-being-the-best.xlsx
-- DI-GENERATE oleh `npm run import:btb`. Jangan diedit tangan; npm test gagal
-- bila file ini tidak lagi sama dengan xlsx.
-- Tidak menimpa perubahan dari web (on conflict do nothing).
-- ============================================================================

insert into ig.btb_programs (code, section, name, due_week) values
  ('A1', 'above', 'Surat Dirut Holding ke seluruh Entitas PTPN Group', date '2026-11-16'),
  ('A2', 'above', 'Culture Guidebook', date '2026-11-16'),
  ('A3', 'above', 'Sosialisasi (Leaders Meeting, BOD Meeting, COMPAS, MRC)', date '2026-11-23'),
  ('A4', 'above', 'Communication Channel (E-Poster, Quiz, Video)', date '2026-11-16'),
  ('A5', 'above', 'Podcast PTPN Group (lead by Holding)', date '2027-01-11'),
  ('B1', 'below', '"Being the Best" Activation Program Journey (Anchor)', date '2026-11-16'),
  ('B2', 'below', 'Learning & Development Program (Terintegrasi)', date '2027-01-11'),
  ('B3', 'below', 'Storytelling & Culture Booster', date '2027-01-11'),
  ('B4', 'below', 'Nusantara EntrePlanters Innovation Competition', date '2027-02-08'),
  ('B5', 'below', 'Culture Roadshow & Culture Show', date '2027-03-08')
on conflict (code) do nothing;

insert into ig.btb_items (program_code, kind, code, name, status, pic, start_date, end_date, note) values
  ('A1', 'activity', 'A1.1', 'Drafting surat Dirut', 'On Progress', 'Agus', date '2026-11-11', date '2026-11-12', null),
  ('A1', 'activity', 'A1.2', 'Review & revisi', 'Not Started', 'Agus', date '2026-11-12', date '2026-11-13', null),
  ('A1', 'activity', 'A1.3', 'Approval & tanda tangan Dirut', 'Not Started', 'Agus', date '2026-11-13', date '2026-11-16', null),
  ('A1', 'activity', 'A1.4', 'Finalisasi & distribusi ke entitas', 'Not Started', 'Agus', date '2026-11-16', date '2026-11-20', null),
  ('A2', 'activity', 'A2.1', 'Menyusun Isi Culture Guidebook', 'Not Started', 'Agus', date '2026-11-16', date '2026-11-16', null),
  ('A2', 'activity', 'A2.2', 'Desain layout Culture Guidebook', 'Not Started', 'Agus', date '2026-11-17', date '2026-11-18', null),
  ('A2', 'activity', 'A2.3', 'Review & approval (Culture team / BOD)', 'Not Started', 'Agus', date '2026-11-19', date '2026-11-19', null),
  ('A2', 'activity', 'A2.4', 'Finalisasi & distribusi Guidebook', 'Not Started', 'Agus', date '2026-11-19', date '2026-11-20', null),
  ('A3', 'group', 'A3.1', 'Sosialisasi Leaders Meeting', null, null, null, null, null),
  ('A3', 'activity', 'A3.1.1', 'Penyusunan materi inti karakter "Being the Best"', 'Not Started', 'Agus', date '2026-11-16', date '2026-11-18', null),
  ('A3', 'activity', 'A3.1.2', 'Koordinasi materi ke dalam agenda Leaders Meeting', 'Not Started', 'Agus', date '2026-11-18', date '2026-11-20', null),
  ('A3', 'activity', 'A3.1.3', 'Sosialisasi turunan ke masing-masing divisi', 'Not Started', 'Agus', date '2026-11-23', date '2026-11-26', null),
  ('A3', 'activity', 'A3.1.4', 'Monitoring dan evaluasi pemahaman nilai hasil sosialisasi LM', 'Not Started', 'Agus', date '2026-11-26', date '2026-11-27', null),
  ('A3', 'group', 'A3.2', 'Sosialisasi Forum Internal (BOD Meeting & COMPAS)', null, null, null, null, null),
  ('A3', 'activity', 'A3.2.1', 'Identifikasi poin topik berbasis evaluasi berkala karakter "lack"', 'Not Started', 'Agus', date '2026-11-23', date '2026-11-25', 'Fasilitasi poin topik berbasis evaluasi berkala karakter lag'),
  ('A3', 'activity', 'A3.2.2', 'Penyusunan talking points & materi Being the Best', 'Not Started', 'Agus', date '2026-11-25', date '2026-11-27', null),
  ('A3', 'activity', 'A3.2.3', 'sosialisasi dalam BOD Meeting', 'Not Started', 'Agus', date '2026-11-30', date '2026-12-02', null),
  ('A3', 'activity', 'A3.2.4', 'pelaksanaan sosialisasi COMPAS', 'Not Started', 'Agus', date '2026-12-03', date '2026-12-04', null),
  ('A4', 'group', 'A4.1', 'E-Poster Being the Best', null, null, null, null, null),
  ('A4', 'activity', 'A4.1.1', 'Penentuan konsep & isu karakter Being the Best', 'Not Started', 'Agus', date '2026-11-16', date '2026-11-17', null),
  ('A4', 'activity', 'A4.1.2', 'Script, Desain visual e-poster', 'Not Started', 'Agus', date '2026-11-17', date '2026-11-19', null),
  ('A4', 'activity', 'A4.1.3', 'Review & approval materi poster', 'Not Started', 'Agus', date '2026-11-19', date '2026-11-20', null),
  ('A4', 'activity', 'A4.1.4', 'Publikasi di kanal komunikasi internal & medsos', 'Not Started', 'Agus', date '2026-11-20', date '2026-11-20', null),
  ('A4', 'group', 'A4.2', 'Kuis Interaktif Being the Best', null, null, null, null, null),
  ('A4', 'activity', 'A4.2.1', 'Penyusunan topik, konsep dan script kuis', 'Not Started', 'Agus', date '2026-11-23', date '2026-11-24', null),
  ('A4', 'activity', 'A4.2.2', 'Pembuatan desain kuis', 'Not Started', 'Agus', date '2026-11-24', date '2026-11-26', null),
  ('A4', 'activity', 'A4.2.3', 'Pengunggahan kuis interaktif', 'Not Started', 'Agus', date '2026-11-27', date '2026-11-27', null),
  ('A4', 'group', 'A4.3', 'Konten Video Being the Best', null, null, null, null, null),
  ('A4', 'activity', 'A4.3.1', 'Storyline & perancangan konsep video Being the Best', 'Not Started', 'Agus', date '2026-11-30', date '2026-12-02', null),
  ('A4', 'activity', 'A4.3.2', 'Produksi rekaman visual, animasi & editing video', 'Not Started', 'Agus', date '2026-12-02', date '2026-12-04', null),
  ('A4', 'activity', 'A4.3.3', 'Review konten bersama tim & approval materi video', 'Not Started', 'Agus', date '2026-12-07', date '2026-12-09', null),
  ('A4', 'activity', 'A4.3.4', 'Publikasi video di kanal komunikasi internal & medsos', 'Not Started', 'Agus', date '2026-12-10', date '2026-12-11', null),
  ('A5', 'activity', 'A5.1', 'Konsep format, seri episode & pilih host / narasumber', 'Not Started', 'Agus', date '2026-12-07', date '2026-12-11', null),
  ('A5', 'activity', 'A5.2', 'Outline & script episode podcast', 'Not Started', 'Agus', date '2026-12-14', date '2026-12-17', null),
  ('A5', 'activity', 'A5.3', 'Koordinasi teknis & jadwal narasumber', 'Not Started', 'Agus', date '2026-12-16', date '2026-12-18', null),
  ('A5', 'activity', 'A5.4', 'Tapping / perekaman studio podcast', 'Not Started', 'Agus', date '2026-12-21', date '2026-12-23', null),
  ('A5', 'activity', 'A5.5', 'Editing & review (termasuk penyesuaian akhir tahun)', 'Not Started', 'Agus', date '2026-12-24', date '2027-01-06', null),
  ('A5', 'activity', 'A5.6', 'Approval final hasil produksi podcast', 'Not Started', 'Agus', date '2027-01-07', date '2027-01-08', null),
  ('A5', 'activity', 'A5.7', 'Rilis & distribusi episode podcast perdana', 'Not Started', 'Agus', date '2027-01-11', date '2027-01-15', null),
  ('B1', 'activity', 'B1.1', 'Penyusunan materi sosialisasi program Activation Journey', 'Not Started', 'Aldira', date '2026-11-09', date '2026-11-11', null),
  ('B1', 'activity', 'B1.2', 'Koordinasi fasilitator & tim pendukung program', 'Not Started', 'Aldira', date '2026-11-12', date '2026-11-13', null),
  ('B1', 'activity', 'B1.3', 'Pelaksanaan sosialisasi program ke entitas/peserta', 'Not Started', 'Aldira', date '2026-11-16', date '2026-11-18', null),
  ('B1', 'activity', 'B1.4', 'Kick-off Activation Program Journey (Anchor)', 'Not Started', 'Aldira', date '2026-11-19', date '2026-11-20', null),
  ('B1', 'activity', 'B1.5', 'Monitoring & evaluasi berkala pelaksanaan program (triwulanan)', 'Not Started', 'Aldira', date '2027-02-15', date '2027-02-19', null),
  ('B2', 'activity', 'B2.1', 'Penyusunan Modul Culture standar Being the Best', 'Not Started', 'Aldira', date '2026-11-23', date '2026-12-04', null),
  ('B2', 'activity', 'B2.2', 'Training of Trainers (ToT) Fasilitator & Culture Show', 'Not Started', 'Aldira', date '2026-12-07', date '2026-12-18', null),
  ('B2', 'activity', 'B2.3', 'Koordinasi alur umum pelatihan & konfirmasi jadwal batch', 'Not Started', 'Aldira', date '2026-12-21', date '2026-12-30', null),
  ('B2', 'activity', 'B2.4', 'Pelaksanaan pelatihan integrasi modul Being the Best', 'Not Started', 'Aldira', date '2027-01-11', date '2027-01-22', null),
  ('B2', 'activity', 'B2.5', 'Evaluasi efektivitas pembelajaran & tindak lanjut implementasi', 'Not Started', 'Aldira', date '2027-01-25', date '2027-01-29', null),
  ('B3', 'activity', 'B3.1', 'Identifikasi tema & narasumber berbasis evaluasi karakter lag', 'Not Started', 'Aldira', date '2026-12-07', date '2026-12-11', null),
  ('B3', 'activity', 'B3.2', 'Penyusunan konsep fasilitasi poin topik & drafting script', 'Not Started', 'Aldira', date '2026-12-14', date '2026-12-18', null),
  ('B3', 'activity', 'B3.3', 'Review materi & approval pimpinan / tim Culture', 'Not Started', 'Aldira', date '2026-12-21', date '2026-12-23', null),
  ('B3', 'activity', 'B3.4', 'Pelaksanaan forum Culture Booster & monitoring keterlibatan', 'Not Started', 'Aldira', date '2027-01-11', date '2027-01-15', null),
  ('B4', 'activity', 'B4.1', 'Desain konsep, kategori & kriteria penilaian', 'Not Started', 'Aldira', date '2026-12-14', date '2026-12-23', null),
  ('B4', 'activity', 'B4.2', 'Susun guidebook, regulasi, juri & hadiah', 'Not Started', 'Aldira', date '2026-12-28', date '2027-01-08', null),
  ('B4', 'activity', 'B4.3', 'Approval BOD', 'Not Started', 'Aldira', date '2027-01-11', date '2027-01-15', null),
  ('B4', 'activity', 'B4.4', 'Desain publikasi & materi komunikasi', 'Not Started', 'Aldira', date '2027-01-18', date '2027-01-29', null),
  ('B4', 'activity', 'B4.5', 'Teaser & pembukaan pendaftaran kompetisi', 'Not Started', 'Aldira', date '2027-02-01', date '2027-02-12', null),
  ('B4', 'activity', 'B4.6', 'Launch kompetisi Nusantara EntrePlanters', 'Not Started', 'Aldira', date '2027-02-08', date '2027-02-12', null),
  ('B5', 'activity', 'B5.1', 'Konsep roadshow, rute & penetapan entitas target', 'Not Started', 'Aldira', date '2027-01-18', date '2027-01-29', null),
  ('B5', 'activity', 'B5.2', 'Koordinasi jadwal bersama entitas & narasumber', 'Not Started', 'Aldira', date '2027-02-01', date '2027-02-12', null),
  ('B5', 'activity', 'B5.3', 'Penyiapan materi & konten interaktif dari Modul Culture', 'Not Started', 'Aldira', date '2027-02-15', date '2027-02-26', null),
  ('B5', 'activity', 'B5.4', 'Pelaksanaan rangkaian Culture Roadshow ke entitas', 'Not Started', 'Aldira', date '2027-03-01', date '2027-03-12', null),
  ('B5', 'activity', 'B5.5', 'Evaluasi efektivitas roadshow & kompilasi laporan', 'Not Started', 'Aldira', date '2027-03-15', date '2027-03-19', null)
on conflict (code) do nothing;

insert into ig.btb_notes (sort, body)
select v.sort, v.body
from (values
  (1, 'Penomoran minggu mengikuti slide: W1 = minggu yang Senin-nya jatuh paling awal di bulan itu (mis. W3 Nov = 16-20 Nov 2026).'),
  (2, 'Due date = minggu launch di slide. Aktivitas ''Milestone'' dibuat satu minggu penuh (Senin-Jumat) sesuai minggu itu.'),
  (3, 'Seluruh durasi & urutan aktivitas adalah estimasi awal saya, bukan data dari tim. Silakan ganti dengan durasi riil dan isi PIC.'),
  (4, 'Program W3 Nov ''26 punya persiapan mulai 2 Nov, sedangkan hari ini sudah 11 Nov. Cek mana yang sudah jalan dan mana yang harus dipadatkan.'),
  (5, 'Libur akhir tahun (24 Des - 1 Jan) diasumsikan tidak ada aktivitas aktif; editing podcast & konten storytelling dibuat melewati periode itu.'),
  (6, 'Anchor Program (B1) hanya dipetakan sampai kick-off. Kalau journey-nya berjalan berminggu-minggu, bisa ditambah baris durasi setelah kick-off.'),
  (7, 'Sheet Kalender dibuat dari data di sheet Gantt per hari ini. Kalau tanggal di Gantt diubah, kalender tidak otomatis ikut dan perlu dibuat ulang.')
) as v(sort, body)
where not exists (select 1 from ig.btb_notes);

-- Dibuat oleh Faiz Hazim Hawari · skill-analysis
