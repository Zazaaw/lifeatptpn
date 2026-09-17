# Instagram Insight @lifeatptpn

Dashboard performa akun Instagram @lifeatptpn: ringkasan akun, konten dengan views tertinggi,
waktu posting terbaik (hari × jam WIB), audiens, dan laporan periodik yang bisa diunduh sebagai Excel.

Data ditarik otomatis dari Instagram Graph API ke Supabase setiap jam. Dashboard hanya membaca database.

## Halaman

| URL | Isi |
|---|---|
| `/` | Ringkasan akun untuk rentang tanggal, dibanding periode sebelumnya |
| `/konten` | Daftar post, filter jenis & urutan (views total, views 24 jam pertama, ER, dll.) |
| `/konten/[id]` | Detail post + grafik pertumbuhan views |
| `/waktu-posting` | Peta hari × jam, rekomendasi slot, jam follower online |
| `/audiens` | Umur & gender, kota, negara, jam online |
| `/konten/[id]#komentar` | Komentar per akun untuk satu post (cari, akun paling aktif, balasan) |
| `/spin-wheel` | Spin Wheel kuis: peserta dari komentar post (filter kata kunci, batas waktu, kecualikan akun) atau input manual |
| `/laporan` | Laporan siap kirim + tombol Unduh Excel dan Cetak |
| `/api/laporan/excel?from=YYYY-MM-DD&to=YYYY-MM-DD` | File .xlsx |

Semua halaman menerima `?from=YYYY-MM-DD&to=YYYY-MM-DD`, jadi tautan bisa dibagikan.

## Menjalankan lokal

```bash
cp .env.example .env     # isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY
npm install
npm run dev              # http://localhost:3000
```

## Deploy ke Vercel

Repo ini siap di-import ke Vercel tanpa pengaturan tambahan (`vercel.json`: framework Next.js,
region fungsi `sin1` Singapura supaya dekat dengan Supabase `ap-southeast-1`).

1. Vercel > **Add New > Project** > import repo ini. Framework terdeteksi otomatis sebagai Next.js.
2. **Settings > Environment Variables**, isi untuk Production (dan Preview bila dipakai):

   | Nama | Isi |
   |---|---|
   | `SUPABASE_URL` | URL project Supabase (`https://<ref>.supabase.co`) |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key (Supabase > Project Settings > API). **Rahasia**, jangan diberi prefix `NEXT_PUBLIC_` |

3. Deploy. Setiap push ke branch utama men-deploy ulang otomatis.

Sinkronisasi data tidak berjalan di Vercel (tidak perlu Vercel Cron): jadwalnya ada di pg_cron Supabase.
Semua halaman dirender per request dari database, jadi angka di Vercel selalu sama dengan data terbaru.

Dashboard **tanpa login**: siapa pun yang tahu URL production bisa melihatnya. Bila tidak boleh publik,
cek **Settings > Deployment Protection** di Vercel (perlindungan untuk domain production umumnya butuh
paket berbayar; cek ketentuan terbaru). Halaman dan API sudah mengirim `X-Robots-Tag: noindex`.

## Deploy ke server sendiri

Butuh Node.js 20.9 atau lebih baru.

```bash
npm ci
npm run build
# next.config.ts memakai output "standalone":
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
cp .env .next/standalone/
cd .next/standalone
PORT=3000 HOSTNAME=0.0.0.0 node server.js
```

Jalankan di belakang reverse proxy (nginx/caddy) dengan HTTPS, dan pakai process manager (pm2/systemd)
supaya hidup ulang otomatis. Dashboard **tanpa login**: bila URL tidak boleh diketahui umum, batasi di
level proxy (IP allowlist atau basic auth). Halaman sudah diberi `noindex`.

`SUPABASE_SERVICE_ROLE_KEY` hanya dibaca di server (`src/lib/supabase-server.ts` bertanda `server-only`).

## Sinkronisasi data (Supabase)

Semua sudah terpasang di project Supabase `maganghub-seleksi`; server Next.js tidak perlu cron sendiri.

| Bagian | Lokasi |
|---|---|
| Tabel | schema `ig` (`supabase/migrations/20260917090000_ig_schema.sql`) |
| Jadwal | pg_cron `ig-sync-hourly` (menit 7 tiap jam), `ig-sync-daily` (00:20 UTC = 07:20 WIB) |
| Worker | Edge function `ig-sync` (`supabase/functions/ig-sync/index.ts`) |
| Rahasia | Vault: `ig_access_token`, `ig_sync_secret`, `ig_project_url` |
| Function baca | `public.ig_dashboard_meta`, `ig_overview`, `ig_content`, `ig_media_detail`, `ig_best_time`, `ig_audience` |

Perintah berguna di SQL editor Supabase:

```sql
select ig.trigger_sync('hourly');                          -- sync manual
select * from ig.sync_logs order by id desc limit 10;       -- cek hasil & galat
select jobname, schedule, active from cron.job where jobname like 'ig-%';
```

### Komentar (izin tambahan)

Komentar per post dan peserta Spin Wheel dari komentar butuh izin **`instagram_business_manage_comments`**.
Token yang dipakai saat setup (17 Sep 2026) belum punya izin ini: API mengembalikan daftar kosong tanpa
galat, dan dashboard menampilkan peringatan "Komentar belum bisa diambil". Spin Wheel tetap bisa dipakai
lewat **Input manual**.

Cara mengaktifkan (nama menu di dashboard Meta bisa sedikit berbeda):

1. Buka app di developers.facebook.com, bagian Instagram API (API setup with Instagram login).
2. Tambahkan izin `instagram_business_manage_comments` pada use case Instagram. Untuk akun milik sendiri,
   Standard Access cukup, tanpa App Review.
3. Pastikan akun @lifeatptpn terdaftar sebagai tester/role di app. Bila tetap kosong, isi Privacy Policy URL
   di App Settings > Basic lalu ubah App Mode ke **Live**.
4. Generate ulang token untuk @lifeatptpn (izin komentar harus tercentang), lalu masukkan ke Vault:

```sql
select vault.update_secret(
  (select id from vault.secrets where name = 'ig_access_token'),
  '<TOKEN_BARU>'
);
select ig.trigger_sync('hourly');
```

5. Cek hasil: `select details->'comments' from ig.sync_logs order by id desc limit 1;`
   `permissionSuspected` harus `false` dan `stored` > 0. Komentar diambil bertahap (maks 30 request per jam).

### Kalau token Instagram mati

Token di-refresh otomatis tiap 7 hari. Bila tetap kedaluwarsa (mis. sync mati lebih dari 60 hari
atau password akun diganti), `ig.sync_logs` akan berstatus `error`. Buat token baru di Meta Developer,
lalu:

```sql
select vault.update_secret(
  (select id from vault.secrets where name = 'ig_access_token'),
  '<TOKEN_BARU>'
);
select ig.trigger_sync('hourly');
```

## Spin Wheel: cara kerja undian

- Pemenang dipilih **sebelum** roda berhenti memakai `crypto.getRandomValues` dengan rejection sampling
  (tanpa bias modulo). Animasi hanya menampilkan hasil itu (`src/lib/wheel.ts`).
- Uji keadilan & ketepatan berhenti: `npm test` (uji chi-square distribusi, bobot, dan 2.800 putaran
  simulasi untuk 1 sampai 2.500 peserta).
- Mode komentar: satu akun satu kesempatan (bisa diubah jadi berbobot per jumlah komentar), komentar yang
  dihapus tidak ikut, akun sendiri dikecualikan secara default.
- Riwayat pemenang hanya tersimpan di browser yang dipakai (localStorage). Unduh CSV untuk arsip.

## Keterbatasan data yang perlu diketahui pembaca laporan

- Metrik harian akun memakai batas hari Meta (tengah malam Pacific, 14.00/15.00 WIB).
- Histori metrik akun diisi bertahap (maks 365 hari ke belakang). Selama periode pembanding belum lengkap, persentase perubahan disembunyikan.
- Views 24 jam pertama hanya tersedia untuk post yang terbit setelah sistem berjalan (17 Sep 2026).
- Instagram tidak menyediakan riwayat jumlah follower dan hanya 30 hari follower baru.

## Dokumen

- `docs/style-kit-setup.md`: panduan style kit
- `docs/typography-spec.md`: spec tipografi (skala φ, bobot, peran teks)

Dibuat oleh Faiz Hazim Hawari · skill-analysis
