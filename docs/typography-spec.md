# Type spec sheet: lifeatptpn-insight dashboard

Template dari skill-typography §27. Token ada di `src/app/globals.css` §3b.

**Kind:** scanning (dashboard) + satu laporan cetak   **Devices:** desktop-first, dicek di 375px
**Scripts:** Latin (Bahasa Indonesia)   **Data-heavy:** ya

## Families

| Role | Family | Weights loaded | Features | License | Delivery |
|---|---|---|---|---|---|
| UI / body / angka | Plus Jakarta Sans (variable) | 400, 500, 600, 700 dipakai (file variable 200–800) | `tnum` untuk angka | SIL OFL | `next/font/google`, subset latin, `--font-jakarta` |
| Mono (ID, kode) | `ui-monospace, "SF Mono", Menlo, Consolas, monospace` | system | `tnum` | system | tanpa unduhan |

Stack: `var(--font-jakarta), ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`

Kenapa satu family: sudah ditetapkan style kit, dan file font v12 (dicek 17 Sep 2026) punya `tnum`
sehingga kolom angka tetap rata tanpa family kedua. Kekurangan yang diterima: tidak ada slashed zero,
jadi ID memakai mono bila ditampilkan.

## Scale

Base: 16px   Ratio: φ = 1.618   Divisions: half-steps (√φ = 1.272) + body-sm (¼ step)
Rounding: 0.5px di dokumen; token memakai rem 3 desimal   Rhythm unit: 25.89px = 1.618rem (`spacing-rhythm`)

| Token (Tailwind) | n | Exact px | rem | Role |
|---|---|---|---|---|
| `text-caption` | −½ | 12.58 | 0.786 | caption, helper, header tabel, label tile KPI, label sumbu chart |
| `text-body-sm` | −¼ | 14.19 | 0.887 | sel tabel, tombol, nav, label form, isi Notice |
| `text-body` | 0 | 16.00 | 1.000 | paragraf, judul kartu, input di ponsel |
| `text-lead` | +½ | 20.35 | 1.272 | judul seksi, angka metrik di detail post |
| `text-h5` | +1 | 25.89 | 1.618 | judul halaman (satu h1 per layar) |
| `text-h4` | +1½ | 32.93 | 2.058 | nilai KPI di bawah `md` |
| `text-kpi` | +2 | 41.89 | 2.618 | nilai KPI dari `md` |
| `text-display` | +2½ | 53.28 | 3.330 | angka sorotan di kepala halaman (redesign) |

## Roles

| Role | Size | Weight | Line-height | Letter-spacing | Max-width | Color | Mobile |
|---|---|---|---|---|---|---|---|
| Page title (h1) | text-h4 (md+), text-h5 | 700 | 1.1 / 1.25 | −0.015em (tracking-tight) | none | foreground | text-h5 |
| Angka sorotan header | text-h4 (sm), text-kpi (lg), text-display (2xl) | 700 | 1.0 | −0.025em, `tabular-nums`, tidak membungkus | none | foreground | text-h5 |
| Section / card title | text-lead | 700 | 1.35 | tracking-tight | none | foreground | sama |
| KPI value | text-kpi (md+), text-h4 | 700 | 1.0 | −0.02em, `tabular-nums` | none | foreground | text-h4 |
| KPI label | text-caption | 500 | 1.4 | 0 | none | muted-foreground | sama |
| Body | text-body | 400 | 1.618 | 0 | 65ch | foreground | sama |
| Subtitle / description | text-body-sm | 400 | 1.5 | 0 | 65–70ch | muted-foreground | sama |
| Table cell | text-body-sm | 400 (600 kolom urutan aktif) | 1.5 | 0, `tabular-nums` kanan | none | foreground | kartu |
| Table header | text-caption | 600 | 1.4 | 0, tidak uppercase | none | muted-foreground | sama |
| Button / nav | text-body-sm | 500 | 1.5 | 0 | satu baris | per varian | sama |
| Input / select | text-body (ponsel), text-body-sm (md+) | 400 | 1.5 | 0 | none | foreground | 16px, cegah zoom iOS |

### Perubahan bobot 17 Sep 2026 (permintaan user)

User meminta judul sapaan, angka follower, username di kartu foto, dan judul kartu dibuat tebal
("ini buat bold dong"). Set bobot berubah dari 400/500/600 menjadi **400 / 500 / 600 / 700**:
400 isi, 500 tombol/nav/label, 600 sel tabel yang ditekankan, **700 judul halaman, judul kartu, dan
semua angka besar** (h4 ke atas). Bobot keempat dibenarkan §15.1 karena 700 hanya dipakai di ukuran
≥ 20px (peran "display" produk ini), tidak di teks isi.

Aksen di judul memakai family dan bobot yang sama, hanya warna (mis. "Life at PTPN" `brand-green-strong`),
sesuai aturan emphasis skill-ui-ux §4.1.

## Loading

`next/font` (self-host saat build, fallback metrik otomatis), `display: swap`, subset latin.

## Accessibility

- Muted foreground kit: `0 0% 45.1%` (#737373) pada putih ±4.7:1 dan `0 0% 63.9%` (#a3a3a3) pada `#0a0a0a` ±7.8:1; digelapkan/diterangkan lagi saat `prefers-contrast: more`.
- `font-synthesis: none`; tidak ada ukuran font `px` di kode aplikasi.
- Teks tidak pernah di-justify; perubahan naik/turun selalu memakai ikon + tanda, bukan warna saja.

## Implementasi yang wajib diketahui

- `cn()` memakai `extendTailwindMerge` dengan daftar token ukuran (`caption` s.d. `display`). Tanpa itu
  tailwind-merge mengira `text-caption` adalah warna dan membuangnya saat digabung `text-muted-foreground`
  (bug ditemukan 17 Sep 2026: label kecil jatuh ke 16px). Token ukuran baru wajib ditambahkan di `src/lib/utils.ts`.

## Exceptions (dengan alasan)

- Label jam pada heatmap dan kolom per jam memakai `text-caption` tetapi hanya tiap 3 jam, supaya tidak berdesakan di 24 kolom.
- Label sumbu kelompok umur di kartu kecil Audiens hanya menulis umur awal ("25" untuk 25-34) karena 7 kolom tidak muat; rentang lengkap ada di pembaca layar, tooltip, dan piramida di bawahnya.
- Caption Instagram ditampilkan apa adanya (termasuk emoji dan em dash) karena itu data milik akun, bukan copy UI.

## Audit

Belum diaudit dengan inventaris DevTools §25.1 di produksi. Dilakukan setelah deploy ke server.

Dibuat oleh Faiz Hazim Hawari · skill-typography
