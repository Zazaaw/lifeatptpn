/**
 * Jenis konten. Urutan & warna TETAP (dataviz: warna mengikuti entitas,
 * bukan peringkat), jadi filter yang menyembunyikan satu jenis tidak
 * mengecat ulang jenis lain. Palet divalidasi, lihat globals.css.
 */
export const KINDS = ["reels", "carousel", "foto", "story", "video"] as const;
export type ContentKind = (typeof KINDS)[number];

export const KIND_LABEL: Record<ContentKind, string> = {
  reels: "Reels",
  carousel: "Carousel",
  foto: "Foto",
  story: "Story",
  video: "Video feed",
};

/** Kelas Tailwind untuk swatch/mark. Teks tidak pernah memakai warna ini. */
export const KIND_SWATCH: Record<ContentKind, string> = {
  reels: "bg-chart-1",
  carousel: "bg-chart-2",
  foto: "bg-chart-3",
  story: "bg-chart-4",
  video: "bg-chart-5",
};

/**
 * Warna teks yang terbaca DI ATAS fill jenis konten (label di dalam segmen),
 * dipilih dari hitungan kontras WCAG per mode (semua >= 4,5:1):
 * terang: reels putih 6,2 | carousel gelap 5,1 | foto gelap 8,1 | story putih 6,6 | video putih 4,5
 * gelap : reels gelap 5,2 | carousel gelap 5,5 | foto gelap 5,2 | story putih 4,9 | video gelap 5,9
 */
export const KIND_ON_FILL: Record<ContentKind, string> = {
  reels: "text-white dark:text-[#0f1a12]",
  carousel: "text-[#0f1a12]",
  foto: "text-[#0f1a12]",
  story: "text-white",
  video: "text-white dark:text-[#0f1a12]",
};

export function isKind(v: unknown): v is ContentKind {
  return typeof v === "string" && (KINDS as readonly string[]).includes(v);
}

export function kindLabel(v: string) {
  return isKind(v) ? KIND_LABEL[v] : v;
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
