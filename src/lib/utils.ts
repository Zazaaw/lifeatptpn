import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * twMerge harus tahu token kustom project ini. Tanpa konfigurasi, tailwind-merge
 * mengira `text-caption` adalah WARNA teks, lalu membuangnya saat bertemu
 * `text-muted-foreground` (ditemukan 17 Sep 2026: label kecil jatuh ke 16px).
 * Hal yang sama untuk `rounded-card` / `rounded-tile` dan bayangan kustom.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["caption", "body-sm", "body", "lead", "h5", "h4", "kpi", "display"] }],
      rounded: [{ rounded: ["card", "tile"] }],
      shadow: [{ shadow: ["card", "ink"] }],
    },
  },
});

/**
 * `clsx` untuk kondisi, `twMerge` supaya kelas yang datang belakangan menang:
 *   cn("px-4 py-2", "px-8")  → "py-2 px-8"
 * Setiap komponen menerima `className` dan menyalurkannya lewat cn() paling akhir.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Dibuat oleh Faiz Hazim Hawari · skill-analysis
