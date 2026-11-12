/**
 * Timeline program budaya "Being the Best" (Above & Below the Line).
 *
 * Sumber: tabel ig.btb_* (dibaca lewat public.ig_btb_list). Isi awalnya
 * di-seed dari data/timeline-being-the-best.xlsx; sejak itu bisa diubah dari web
 * dengan PIN yang sama seperti Content Plan.
 *
 * Modul ini murni (tanpa import) supaya bisa dipakai Server Component, Client
 * Component (dialog edit), dan tests/being-the-best.test.mts di Node langsung.
 *
 * Yang dihitung di sini (bukan dari data tim) hanya turunan tanggal terhadap hari
 * ini (WIB): "Lewat jadwal" dan "Jadwal sudah mulai". Keduanya diberi label begitu
 * di UI supaya tidak terbaca sebagai status yang diisi tim.
 */

export type BtbSectionKey = "above" | "below";

/** Baris dari ig_btb_list (tanggal "YYYY-MM-DD"). */
export type BtbRow = {
  id: string;
  kind: "activity" | "group";
  code: string;
  name: string;
  status: string | null;
  pic: string | null;
  start: string | null;
  end: string | null;
  note: string | null;
};
export type BtbProgramRow = { code: string; section: BtbSectionKey; name: string; due_week: string | null; items: BtbRow[] };
export type BtbList = { today: string; updated_at: string | null; programs: BtbProgramRow[]; notes: string[] };

export type BtbActivity = {
  kind: "activity";
  id: string;
  code: string;
  name: string;
  status: string | null;
  pic: string | null;
  start: string;
  end: string;
  /** Hari kerja Senin s.d. Jumat, inklusif (NETWORKDAYS tanpa libur, sama dengan rumus di file). */
  workdays: number;
  note: string | null;
  /** Kode judul kelompok induknya (A3.1 untuk A3.1.2), bila ada. */
  group: string | null;
};
export type BtbGroup = { kind: "group"; id: string; code: string; name: string; note: string | null };
export type BtbItem = BtbActivity | BtbGroup;
export type BtbProgram = { code: string; section: BtbSectionKey; name: string; dueWeek: string | null; due: string | null; items: BtbItem[] };
export type BtbSection = { key: BtbSectionKey; label: string; programs: BtbProgram[] };
export type BtbWeek = { start: string; month: string; label: string };

export const BTB_SECTIONS: { key: BtbSectionKey; label: string }[] = [
  { key: "above", label: "Above the Line" },
  { key: "below", label: "Below the Line" },
];
export const isSectionKey = (v: unknown): v is BtbSectionKey => v === "above" || v === "below";

/** Status yang boleh dipilih. Sama dengan constraint btb_items_status_valid. */
export const BTB_STATUSES = ["Not Started", "On Progress", "Done"] as const;
export type BtbStatus = (typeof BTB_STATUSES)[number];
export const isBtbStatus = (v: unknown): v is BtbStatus => typeof v === "string" && (BTB_STATUSES as readonly string[]).includes(v);

export const PROGRAM_CODE = /^[A-Z][0-9]{1,3}$/;
export const ITEM_CODE = /^[A-Z][0-9]{1,3}(\.[0-9]{1,3}){1,4}$/;

// ---- tanggal (UTC murni, tanpa zona) -------------------------------------------

const DAY = 86_400_000;
const t = (ymd: string) => Date.parse(`${ymd}T00:00:00Z`);
const ymdOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDaysYmd = (ymd: string, n: number) => ymdOf(t(ymd) + n * DAY);
/** Selisih hari (to - from), bukan inklusif. */
export const daysBetween = (from: string, to: string) => Math.round((t(to) - t(from)) / DAY);
export const mondayOf = (ymd: string) => addDaysYmd(ymd, -((new Date(t(ymd)).getUTCDay() + 6) % 7));

/** NETWORKDAYS(start, end) tanpa libur: Senin s.d. Jumat, kedua ujung ikut dihitung. */
export function networkdays(start: string, end: string): number {
  if (end < start) return -networkdays(end, start);
  let n = 0;
  for (let ms = t(start); ms <= t(end); ms += DAY) {
    const dow = new Date(ms).getUTCDay();
    if (dow !== 0 && dow !== 6) n++;
  }
  return n;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/**
 * Label minggu seperti di file: W1 = minggu yang Senin-nya paling awal di bulan
 * itu (catatan 1 sheet Ringkasan), jadi bulan ditentukan oleh hari Senin-nya.
 * 16 Nov 2026 -> { label: "W3", month: "Nov '26" }; 30 Nov 2026 -> W5 Nov.
 */
export function weekOf(ymd: string): BtbWeek {
  const monday = mondayOf(ymd);
  const d = new Date(t(monday));
  return {
    start: monday,
    label: `W${Math.floor((d.getUTCDate() - 1) / 7) + 1}`,
    month: `${MONTHS[d.getUTCMonth()]} '${String(d.getUTCFullYear()).slice(2)}`,
  };
}
export const weekLabel = (ymd: string) => {
  const w = weekOf(ymd);
  return `${w.label} ${w.month}`;
};

/**
 * Kolom minggu untuk Gantt: dari Senin pertama bulan tanggal paling awal (seperti
 * header file yang mulai di W1) sampai minggu tanggal paling akhir.
 */
export function weeksFor(dates: string[]): BtbWeek[] {
  if (!dates.length) return [];
  const min = dates.reduce((m, d) => (d < m ? d : m));
  const max = dates.reduce((m, d) => (d > m ? d : m));
  const first = min.slice(0, 8) + "01";
  const firstMonday = addDaysYmd(first, (8 - new Date(t(first)).getUTCDay()) % 7);
  let cur = firstMonday <= min ? firstMonday : mondayOf(min);
  const last = mondayOf(max);
  const out: BtbWeek[] = [];
  while (cur <= last && out.length < 260) {
    out.push(weekOf(cur));
    cur = addDaysYmd(cur, 7);
  }
  return out;
}

// ---- status & jadwal ---------------------------------------------------------------

const DONE = /^(done|selesai|completed?|finished)$/i;
const IN_PROGRESS = /progress|berjalan|proses/i;
export const isDone = (s: string | null) => Boolean(s && DONE.test(s.trim()));
export const isInProgress = (s: string | null) => Boolean(s && !isDone(s) && IN_PROGRESS.test(s));
const isNotStarted = (s: string | null) => !s || /^(not started|belum( mulai)?)$/i.test(s.trim());

/** Nilai filter status di URL. */
export const statusSlug = (s: string | null) => (s ? s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : "tanpa-status");

export type Schedule = "late" | "should-start" | null;

/**
 * Posisi aktivitas terhadap hari ini menurut tanggalnya.
 * late: tanggal End sudah lewat tetapi statusnya belum Done.
 * should-start: hari ini di dalam rentang jadwal, status masih Not Started.
 */
export function scheduleOf(a: Pick<BtbActivity, "status" | "start" | "end">, today: string): Schedule {
  if (isDone(a.status)) return null;
  if (a.end < today) return "late";
  if (a.start <= today && isNotStarted(a.status)) return "should-start";
  return null;
}

// ---- bentuk data untuk halaman --------------------------------------------------------

/** Baris database -> bagian/program/item siap tampil (durasi & induk kelompok dihitung di sini). */
export function shapeBtb(list: BtbList): BtbSection[] {
  return BTB_SECTIONS.map((s) => ({
    key: s.key,
    label: s.label,
    programs: list.programs
      .filter((p) => p.section === s.key)
      .map((p) => {
        const groups = new Set(p.items.filter((i) => i.kind === "group").map((i) => i.code));
        const items: BtbItem[] = p.items.map((i) => {
          if (i.kind === "group" || !i.start || !i.end) return { kind: "group", id: i.id, code: i.code, name: i.name, note: i.note };
          const parent = i.code.split(".").slice(0, -1).join(".");
          return {
            kind: "activity",
            id: i.id,
            code: i.code,
            name: i.name,
            status: i.status,
            pic: i.pic,
            start: i.start,
            end: i.end,
            workdays: networkdays(i.start, i.end),
            note: i.note,
            group: groups.has(parent) ? parent : null,
          };
        });
        return { code: p.code, section: p.section, name: p.name, dueWeek: p.due_week, due: p.due_week ? weekLabel(p.due_week) : null, items };
      }),
  }));
}

export const activitiesOf = (p: BtbProgram) => p.items.filter((i): i is BtbActivity => i.kind === "activity");

/** Semua tanggal yang perlu muat di sumbu: Start/End aktivitas dan minggu due. */
export function datesOf(sections: BtbSection[]) {
  return sections.flatMap((s) =>
    s.programs.flatMap((p) => [
      ...(p.dueWeek ? [p.dueWeek, addDaysYmd(p.dueWeek, 4)] : []),
      ...activitiesOf(p).flatMap((a) => [a.start, a.end]),
    ])
  );
}

/** Rentang program = aktivitas paling awal s.d. paling akhir (rumus MIN/MAX sheet Ringkasan). */
export function programSpan(p: BtbProgram) {
  const acts = activitiesOf(p);
  if (!acts.length) return null;
  const start = acts.reduce((m, a) => (a.start < m ? a.start : m), acts[0].start);
  const end = acts.reduce((m, a) => (a.end > m ? a.end : m), acts[0].end);
  // ROUND((end - start) / 7, 1), sama dengan kolom "Lead time (minggu)" di Ringkasan.
  const leadWeeks = Math.round((daysBetween(start, end) / 7) * 10) / 10;
  return { start, end, leadWeeks, count: acts.length };
}

/** Sumbu waktu: Senin minggu pertama s.d. Minggu setelah minggu terakhir. */
export function axisOf(weeks: BtbWeek[]) {
  const start = weeks[0]?.start ?? "1970-01-05";
  const days = Math.max(weeks.length, 1) * 7;
  /** Persen dari kiri untuk awal hari `ymd`. */
  const at = (ymd: string) => (daysBetween(start, ymd) / days) * 100;
  /** Persen lebar untuk rentang inklusif. */
  const span = (from: string, to: string) => ((daysBetween(from, to) + 1) / days) * 100;
  const contains = (ymd: string) => {
    const d = daysBetween(start, ymd);
    return d >= 0 && d < days;
  };
  return { start, days, at, span, contains };
}

/** Bulan di header beserta jumlah minggunya (untuk kolom bulan yang membentang). */
export function monthsOf(weeks: BtbWeek[]) {
  const out: { month: string; count: number; first: number }[] = [];
  weeks.forEach((w, i) => {
    const last = out.at(-1);
    if (last && last.month === w.month) last.count++;
    else out.push({ month: w.month, count: 1, first: i });
  });
  return out;
}

/**
 * Kode berikutnya di bawah `prefix` (A3 -> A3.3 bila A3.1 dan A3.2 sudah ada;
 * A3.1 -> A3.1.5). Hanya saran: user tetap bisa mengetik kode lain.
 */
export function nextCode(prefix: string, codes: string[]) {
  const depth = prefix.split(".").length + 1;
  const used = codes
    .filter((c) => c.startsWith(`${prefix}.`) && c.split(".").length === depth)
    .map((c) => Number(c.split(".").at(-1)));
  return `${prefix}.${(used.length ? Math.max(...used) : 0) + 1}`;
}

/** Kode program berikutnya untuk satu bagian (huruf mengikuti program yang sudah ada: A untuk Above, B untuk Below). */
export function nextProgramCode(section: BtbSectionKey, codes: string[], sectionCodes: string[]) {
  const letter = sectionCodes[0]?.charAt(0) ?? (section === "above" ? "A" : "B");
  const nums = codes.filter((c) => c.startsWith(letter)).map((c) => Number(c.slice(1)));
  return `${letter}${(nums.length ? Math.max(...nums) : 0) + 1}`;
}

// Dibuat oleh Faiz Hazim Hawari · skill-analysis
