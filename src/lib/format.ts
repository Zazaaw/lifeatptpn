/**
 * Format angka & tanggal untuk tampilan. Satu tempat supaya layar, laporan,
 * dan Excel memakai gaya yang sama (id-ID, WIB).
 *
 * Aturan copy (skill-ui-ux §9.G): tidak ada em dash / en dash di teks yang
 * terlihat. Rentang tanggal ditulis "1 Sep 2026 s.d. 30 Sep 2026".
 */

export const TZ = "Asia/Jakarta";
const MINUS = "−"; // tanda minus matematika, bukan dash

const intFmt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const compactFmt = new Intl.NumberFormat("id-ID", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** 45.870 · "Tidak tersedia" untuk null supaya tidak terbaca sebagai nol. */
export function fmtInt(v: number | null | undefined, empty = "Tidak tersedia") {
  return isNum(v) ? intFmt.format(v).replace("-", MINUS) : empty;
}

/** 45,9 rb · 1,2 jt */
export function fmtCompact(v: number | null | undefined, empty = "Tidak tersedia") {
  return isNum(v) ? compactFmt.format(v).replace("-", MINUS) : empty;
}

/** 0.0551 → "5,51%" */
export function fmtPct(ratio: number | null | undefined, digits = 2, empty = "Tidak tersedia") {
  if (!isNum(ratio)) return empty;
  return (
    new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
      .format(ratio * 100)
      .replace("-", MINUS) + "%"
  );
}

/** Perubahan relatif; null bila pembanding kosong atau nol. */
export function pctChange(current: number | null | undefined, previous: number | null | undefined) {
  if (!isNum(current) || !isNum(previous) || previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

export function fmtSignedPct(ratio: number | null, digits = 1) {
  if (!isNum(ratio)) return null;
  const abs = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Math.abs(ratio * 100));
  return `${ratio > 0 ? "+" : ratio < 0 ? MINUS : ""}${abs}%`;
}

export function fmtSignedInt(v: number | null | undefined) {
  if (!isNum(v)) return null;
  return `${v > 0 ? "+" : v < 0 ? MINUS : ""}${intFmt.format(Math.abs(v))}`;
}

/** ms → "14,6 detik" */
export function fmtSeconds(ms: number | null | undefined) {
  if (!isNum(ms)) return "Tidak tersedia";
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(ms / 1000)} detik`;
}

const dateFmt = new Intl.DateTimeFormat("id-ID", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
  year: "numeric",
});
const dateTimeFmt = new Intl.DateTimeFormat("id-ID", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const dayMonthFmt = new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", day: "numeric", month: "short" });
const plainDateFmt = new Intl.DateTimeFormat("id-ID", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Instant (ISO timestamp) → "17 Sep 2026" dalam WIB */
export function fmtDate(iso: string | null | undefined) {
  return iso ? dateFmt.format(new Date(iso)) : "Tidak tersedia";
}

/** Instant → "17 Sep 2026 16.20 WIB" */
export function fmtDateTime(iso: string | null | undefined) {
  return iso ? `${dateTimeFmt.format(new Date(iso))} WIB` : "Tidak tersedia";
}

/** Tanggal kalender "2026-09-17" (tanpa zona) → "17 Sep 2026" */
export function fmtYmd(ymd: string | null | undefined) {
  return ymd ? plainDateFmt.format(new Date(`${ymd}T00:00:00Z`)) : "Tidak tersedia";
}

/** "2026-09-17" → "17 Sep" */
export function fmtYmdShort(ymd: string) {
  return dayMonthFmt.format(new Date(`${ymd}T00:00:00Z`));
}

export function fmtRange(from: string, to: string) {
  return from === to ? fmtYmd(from) : `${fmtYmd(from)} s.d. ${fmtYmd(to)}`;
}

/** "3 jam lalu" */
export function fmtRelative(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return "belum pernah";
  const diffMin = Math.round((now - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const h = Math.round(diffMin / 60);
  if (h < 48) return `${h} jam lalu`;
  return `${Math.round(h / 24)} hari lalu`;
}

export const DAY_NAMES = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"] as const;
export const DAY_SHORT = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"] as const;

export function fmtHour(h: number) {
  return `${String(h).padStart(2, "0")}.00`;
}

/** "08.00 s.d. 08.59" */
export function fmtHourSlot(h: number) {
  return `${String(h).padStart(2, "0")}.00 s.d. ${String(h).padStart(2, "0")}.59`;
}

// Dibuat oleh Faiz Hazim Hawari · skill-typography
