# Setup — Style Kit v4 di Project Baru

Panduan langkah-demi-langkah dari nol sampai halaman pertama jalan.
Estimasi: **10 menit**.

Kit ini untuk **Tailwind v4** — versi terbaru. Nggak ada
`tailwind.config.ts`; semua konfigurasi ada di dalam CSS.

---

## Langkah 1 — Bikin project Next.js

```bash
npx create-next-app@latest nama-project-baru
cd nama-project-baru
```

Jawab prompt-nya:

| Pertanyaan | Jawab |
|---|---|
| TypeScript? | **Yes** |
| ESLint? | Yes |
| Tailwind CSS? | **Yes** ← kali ini Yes, v4 memang default |
| `src/` directory? | **Yes** |
| App Router? | **Yes** |
| Turbopack? | Yes |
| Import alias? | **No** (pakai default `@/*`) |

Pastikan yang keinstall memang v4:

```bash
npm ls tailwindcss
```

Harus `tailwindcss@4.x.x`. Kalau ternyata `3.x`, pakai
[kit v3](../v3/SETUP.md) saja.

---

## Langkah 2 — Install dependencies

```bash
# Pengganti tailwindcss-animate untuk v4 (CSS-first, bukan plugin JS)
npm i tw-animate-css

# Utilities inti
npm i clsx tailwind-merge class-variance-authority

# Untuk Button asChild
npm i @radix-ui/react-slot

# Untuk BlurFade / DotPattern / GridPattern
npm i framer-motion

# Dark mode toggle
npm i next-themes
```

> **Kenapa `tw-animate-css`?** Plugin lama `tailwindcss-animate` itu berbasis
> JavaScript dan nggak jalan di v4. `tw-animate-css` adalah penggantinya yang
> resmi direkomendasikan — pure CSS, di-import langsung dari `globals.css`.
> Ini juga yang dipakai shadcn/ui untuk v4.

---

## Langkah 3 — Cek `postcss.config.mjs`

`create-next-app` biasanya sudah membuatnya dengan isi yang benar:

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

Kalau isinya masih format v3 (`tailwindcss: {}` + `autoprefixer: {}`),
timpa dengan yang di atas dan install `npm i -D @tailwindcss/postcss`.

---

## Langkah 4 — Copy file dari kit

| Dari | Ke |
|---|---|
| `globals.css` | `src/app/globals.css` *(timpa)* |
| `lib/utils.ts` | `src/lib/utils.ts` |
| `components/ui/*` (8 file) | `src/components/ui/` |
| `components/effects/*` (3 file) | `src/components/effects/` |

**Tidak ada `tailwind.config.ts`** — kalau `create-next-app` sempat membuatnya,
hapus saja; v4 mengabaikannya.

**Cara cepat via terminal:**

```bash
# Git Bash / macOS / Linux
KIT="d:/path/ke/p441z-style-kit/v4"
PROJECT="d:/path/ke/project-baru"

mkdir -p "$PROJECT/src/lib" "$PROJECT/src/components/ui" "$PROJECT/src/components/effects"
cp "$KIT/globals.css"      "$PROJECT/src/app/globals.css"
cp "$KIT/lib/utils.ts"     "$PROJECT/src/lib/utils.ts"
cp "$KIT"/components/ui/*      "$PROJECT/src/components/ui/"
cp "$KIT"/components/effects/* "$PROJECT/src/components/effects/"

# v4 nggak pakai config file
rm -f "$PROJECT/tailwind.config.ts" "$PROJECT/tailwind.config.js"
```

Struktur akhirnya:

```
project-baru/
├── postcss.config.mjs
├── tsconfig.json
└── src/
    ├── app/
    │   ├── globals.css      ← ini SEKALIGUS config-nya
    │   ├── layout.tsx
    │   └── page.tsx
    ├── lib/
    │   └── utils.ts
    └── components/
        ├── ui/          (8 file)
        └── effects/     (3 file)
```

---

## Langkah 5 — Cek path alias

Di `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

Biasanya sudah otomatis. Kalau belum, tambahkan lalu restart dev server.

---

## Langkah 6 — Setup `layout.tsx`

Timpa `src/app/layout.tsx`:

```tsx
import "./globals.css";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Project Baru",
  description: "Deskripsi singkat.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning WAJIB kalau pakai next-themes —
    // library-nya menulis class tema ke <html> sebelum React hydrate.
    <html lang="id" suppressHydrationWarning>
      <body className={sans.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

Bikin `src/components/theme-provider.tsx`:

```tsx
"use client";

import * as React from "react";
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

---

## Langkah 7 — Halaman uji

Timpa `src/app/page.tsx`:

```tsx
import BlurFade from "@/components/effects/blur-fade";
import PageHeader from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <BlurFade>
        <PageHeader
          title="Halo, ini project baru"
          subtitle="Kalau teks ini muncul sambil fade-in dari blur tipis, style kit-nya sudah jalan."
          action={<Button>Tombol</Button>}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          {[1, 2].map((n) => (
            <BlurFade key={n} inView delay={n * 0.05}>
              <Card>
                <CardHeader>
                  <CardTitle>Kartu {n}</CardTitle>
                  <CardDescription>Deskripsi pendek di sini.</CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Badge>Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                </CardContent>
              </Card>
            </BlurFade>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
        </div>

        {/* Cek token warna + opacity modifier */}
        <div className="mt-10 flex gap-3">
          <div className="h-12 w-12 rounded-md bg-primary" />
          <div className="h-12 w-12 rounded-md bg-primary/50" />
          <div className="h-12 w-12 rounded-md bg-muted" />
          <div className="h-12 w-12 rounded-md border" />
        </div>
      </BlurFade>
    </main>
  );
}
```

---

## Langkah 8 — Jalankan

```bash
npm run dev
```

Buka http://localhost:3000

### Checklist "berhasil"

- [ ] Judul besar tebal, subtitle abu-abu di bawahnya
- [ ] Konten **fade-in dari blur tipis** sambil naik sedikit
- [ ] Dua kartu punya border + rounded + shadow halus
- [ ] Lima tombol tampil beda-beda
- [ ] Empat kotak warna di bawah: hitam pekat, **hitam transparan 50%**,
      abu muda, dan kotak berbingkai
      ← kotak kedua penting: itu bukti opacity modifier jalan
- [ ] Scrollbar berbentuk **pil membulat** (perlu konten panjang)
- [ ] Font-nya Plus Jakarta Sans

Gagal? Lihat [Troubleshooting](#troubleshooting).

---

## Langkah 9 — Ambient background (opsional tapi khas)

Ini yang bikin halaman terasa hidup. Di `layout.tsx`, dalam `<ThemeProvider>`:

```tsx
import DotPattern from "@/components/effects/dot-pattern";
import GridPattern from "@/components/effects/grid-pattern";

// ...
<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  {/* Dua lapis tekstur, mask-nya saling berlawanan arah */}
  <div className="pointer-events-none fixed inset-0 z-0">
    <DotPattern
      width={20} height={20} cx={1} cy={1} cr={1}
      className="[mask-image:linear-gradient(to_bottom_right,white,transparent,transparent)]"
    />
  </div>
  <div className="pointer-events-none fixed inset-0 z-0">
    <GridPattern
      width={50} height={50} duration={15} repeatDelay={1}
      maxOpacity={0.1} x={-1} y={-1}
      className="[mask-image:linear-gradient(to_top_left,white,transparent,transparent)]"
    />
  </div>

  {/* Konten WAJIB relative + z di atas 0 */}
  <div className="relative z-20">{children}</div>
</ThemeProvider>
```

---

## Langkah 10 — Tombol dark mode (opsional)

`npm i lucide-react`, lalu `src/components/mode-toggle.tsx`:

```tsx
"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Ganti tema"
    >
      <Sun className="dark:hidden" />
      <Moon className="hidden dark:block" />
    </Button>
  );
}
```

Pasang lewat prop `action`:

```tsx
<PageHeader title="…" subtitle="…" action={<ModeToggle />} />
```

> Ikonnya nggak perlu `h-4 w-4` — Button v4 sudah otomatis mengatur ukuran
> SVG anaknya lewat `[&_svg:not([class*='size-'])]:size-4`.

---

## Langkah 11 — Ganti warna brand (opsional)

Di `src/app/globals.css`, ubah **hanya** 3 token:

```css
:root {
  --primary: 243 75% 59%;          /* indigo-600 */
  --primary-foreground: 0 0% 98%;
  --ring: 243 75% 59%;
}
.dark {
  --primary: 243 75% 68%;          /* lebih terang buat background gelap */
  --primary-foreground: 0 0% 9%;
  --ring: 243 75% 68%;
}
```

**Jangan** ubah `--background`, `--foreground`, `--muted`, `--border`.
Biarkan abu-abu — justru itu yang bikin desainnya bersih.

⚠️ Wajib triplet telanjang (`243 75% 59%`), **bukan** `hsl(243 75% 59%)`.
Kalau ditulis lengkap, `bg-primary/90` dan semua opacity modifier rusak.

### Mau pakai OKLCH?

v4 memang lebih suka OKLCH. Kalau mau ganti, ubah **dua tempat**:

```css
/* 1. Nilai token — sekarang full function */
:root { --primary: oklch(0.51 0.23 277); }

/* 2. Mapping di @theme inline — buang wrapper hsl() */
@theme inline {
  --color-primary: var(--primary);   /* bukan hsl(var(--primary)) */
}
```

Harus konsisten — jangan campur. Kit ini pakai HSL supaya nilainya sama
persis dengan portfolio aslinya.

---

## Troubleshooting

### Styling nggak muncul sama sekali

Cek `postcss.config.mjs` isinya `"@tailwindcss/postcss": {}` (bukan format
v3). Lalu pastikan `globals.css` di-import di `layout.tsx` dan baris
pertamanya `@import "tailwindcss";`.

### `Cannot resolve "tw-animate-css"`

```bash
npm i tw-animate-css
```
Kalau memang belum butuh animasi accordion dll, boleh juga hapus baris
`@import "tw-animate-css";` dari `globals.css`.

### Warna jalan tapi `bg-primary/50` nggak transparan

Token ditulis pakai `hsl(...)` di `:root`. Harus triplet telanjang:
```css
--primary: 0 0% 9%;        /* ✅ */
--primary: hsl(0 0% 9%);   /* ❌ */
```

### Dark mode nggak jalan

Tiga hal:
1. Baris `@custom-variant dark (&:where(.dark, .dark *));` ada di
   `globals.css` ✅ (sudah termasuk di kit)
2. `<ThemeProvider attribute="class">` — bukan `data-theme`
3. `suppressHydrationWarning` di tag `<html>`

### Class `border` nggak ada warnanya

v4 menghapus default border color. Kit sudah mengembalikannya lewat blok
`@layer base` — pastikan bagian itu nggak terhapus saat copy.

### `Cannot find module '@/lib/utils'`

`tsconfig.json` belum punya `paths` (Langkah 5). Restart dev server setelah
mengubahnya — TS server nggak reload otomatis.

### `Module not found: framer-motion`

```bash
npm i framer-motion
```

### Error hydration mismatch

Tambahkan `suppressHydrationWarning` di `<html>` (Langkah 6).

### Shadow-nya kelihatan lebih tebal/tipis dari perkiraan

Skala shadow v4 bergeser satu tingkat dari v3:

| v3 | v4 |
|---|---|
| `shadow-sm` | `shadow-xs` |
| `shadow` | `shadow-sm` |
| `shadow-md` | `shadow-md` (sama) |

Kit ini sudah disesuaikan. Kalau kamu menyalin snippet lama dari internet
(kebanyakan masih v3), sesuaikan sendiri.

### Scrollbar masih bawaan browser

Firefox cuma mendukung `scrollbar-width`/`scrollbar-color` (sudah termasuk,
tampilannya lebih sederhana). Pil penuh cuma di Chrome/Edge/Safari.

---

## Referensi lanjutan

Setelah jalan, baca dokumen ini:

- **[docs/DESIGN.md](../docs/DESIGN.md)** - filosofi desain. Baca ini sebelum
  bikin UI; isinya yang bikin hasilnya "kelihatan seperti aslinya"
- **[docs/RECIPES.md](../docs/RECIPES.md)** - 12 pola siap tempel
- **[docs/COMPONENTS.md](../docs/COMPONENTS.md)** - referensi props
- **[docs/MIGRATION.md](../docs/MIGRATION.md)** - cheat sheet v3 ke v4
- **[../README.md](../README.md)** - ikhtisar repo

---

## Ringkasan perintah

```bash
# 1. Scaffold (Tailwind = Yes)
npx create-next-app@latest nama-project-baru
cd nama-project-baru

# 2. Dependencies
npm i tw-animate-css clsx tailwind-merge class-variance-authority \
      @radix-ui/react-slot framer-motion next-themes

# 3. Copy file kit + hapus tailwind.config.ts (lihat Langkah 4)
# 4-7. Setup layout + halaman uji
# 8. Jalankan
npm run dev
```
