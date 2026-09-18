/** Menu utama. Satu sumber untuk sidebar desktop dan drawer ponsel. */
export const NAV_ITEMS = [
  { href: "/", label: "Ringkasan", icon: "overview" },
  { href: "/konten", label: "Konten", icon: "content" },
  { href: "/rencana", label: "Rencana", icon: "plan" },
  { href: "/waktu-posting", label: "Waktu Posting", icon: "time" },
  { href: "/audiens", label: "Audiens", icon: "audience" },
  { href: "/spin-wheel", label: "Spin Wheel Kuis", icon: "wheel" },
  { href: "/laporan", label: "Laporan", icon: "report" },
] as const;

export type NavIcon = (typeof NAV_ITEMS)[number]["icon"];

/** Rentang tanggal hanya dibawa ke halaman yang memakainya. */
export const RANGE_AWARE = new Set(["/", "/konten", "/waktu-posting", "/laporan"]); // /rencana memakai parameter bulan sendiri

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
