import "./globals.css";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/shell/app-shell";

/*
 * Satu family (skill-typography): Plus Jakarta Sans variable 200-800 sudah
 * punya fitur tnum (dicek dari file font Google Fonts v12, 2026-09-17), jadi
 * angka tabel dan KPI bisa rata tanpa family kedua. Bobot yang dipakai:
 * 400 / 500 / 600 / 700 (700 untuk judul dan angka besar, docs/typography-spec.md).
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: {
    default: "Life at PTPN Insight",
    template: "%s | Life at PTPN Insight",
  },
  description: "Dashboard performa akun Instagram @lifeatptpn.",
  // Dashboard tanpa login: jangan sampai terindeks mesin pencari.
  robots: { index: false, follow: false, nocache: true },
};

// Semua halaman membaca data terbaru dari Supabase per request.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning wajib untuk next-themes: class tema ditulis ke
    // <html> sebelum React hydrate.
    <html lang="id" className={jakarta.variable} suppressHydrationWarning>
      <body className="min-h-dvh font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
