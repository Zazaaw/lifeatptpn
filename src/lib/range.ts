/**
 * Rentang tanggal dari query string (?from=YYYY-MM-DD&to=YYYY-MM-DD).
 *
 * Divalidasi di server: parameter rusak tidak membuat halaman crash, tetapi
 * jatuh ke default dan halaman memberi tahu user (skill-analysis §9.6).
 */

export const MAX_RANGE_DAYS = 800;

export type DateRange = {
  from: string;
  to: string;
  days: number;
  /** Diisi bila parameter dari URL tidak valid dan diganti default. */
  notice?: string;
};

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function todayWib(now = new Date()) {
  return new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

export function addDays(ymd: string, n: number) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function diffDays(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400_000) + 1;
}

function isValidYmd(s: unknown): s is string {
  if (typeof s !== "string" || !YMD.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/**
 * Default: N hari (28 kecuali halaman meminta lain) yang berakhir kemarin (WIB). Hari ini belum lengkap, dan
 * metrik harian akun dari Meta masih bergerak sekitar 48 jam.
 */
export function defaultRange(now = new Date(), days = 28): DateRange {
  const to = addDays(todayWib(now), -1);
  const from = addDays(to, -(days - 1));
  return { from, to, days };
}

function label(days: number) {
  return days >= 365 ? "12 bulan terakhir" : `${days} hari terakhir`;
}

export function parseRange(
  params: { [key: string]: string | string[] | undefined },
  { now = new Date(), defaultDays = 28 }: { now?: Date; defaultDays?: number } = {}
): DateRange {
  const from = params.from;
  const to = params.to;
  const fallback = defaultRange(now, defaultDays);
  if (from === undefined && to === undefined) return fallback;

  if (!isValidYmd(from) || !isValidYmd(to)) {
    return { ...fallback, notice: `Tanggal di alamat halaman tidak valid, jadi rentang dikembalikan ke ${label(defaultDays)}.` };
  }
  if (to < from) {
    return { ...fallback, notice: `Tanggal akhir lebih awal dari tanggal mulai, jadi rentang dikembalikan ke ${label(defaultDays)}.` };
  }
  const days = diffDays(from, to);
  if (days > MAX_RANGE_DAYS) {
    return { ...fallback, notice: `Rentang maksimal ${MAX_RANGE_DAYS} hari, jadi rentang dikembalikan ke ${label(defaultDays)}.` };
  }
  return { from, to, days };
}

export function rangeQuery(range: { from: string; to: string }, extra: Record<string, string | undefined> = {}) {
  const q = new URLSearchParams({ from: range.from, to: range.to });
  for (const [k, v] of Object.entries(extra)) if (v) q.set(k, v);
  return q.toString();
}

export function pickString(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

// Dibuat oleh Faiz Hazim Hawari · skill-analysis
