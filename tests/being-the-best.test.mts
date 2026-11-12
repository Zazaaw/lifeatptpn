// Memastikan Being the Best sesuai xlsx tim. Jalankan: npm test
//  1. Migrasi seed identik dengan xlsx (gagal = file xlsx diganti tetapi
//     `npm run import:btb` belum dijalankan, atau seed diedit tangan).
//  2. Aturan minggu/due/durasi di halaman menghasilkan header & angka yang sama dengan file.
import { readFile } from "node:fs/promises";
import { buildSeedSql, parseBeingTheBest } from "../scripts/being-the-best-parse.mjs";
import {
  activitiesOf,
  datesOf,
  networkdays,
  nextCode,
  nextProgramCode,
  programSpan,
  shapeBtb,
  weekLabel,
  weeksFor,
  type BtbList,
} from "../src/lib/being-the-best.ts";

let fail = 0;
const ok = (c: boolean, m: string) => {
  if (!c) {
    fail++;
    console.log("FAIL", m);
  }
};

type P = { code: string; name: string; due: string | null; dueWeek: string | null; items: Record<string, unknown>[] };
const { data } = await parseBeingTheBest("data/timeline-being-the-best.xlsx");

// 1) seed
const seed = await readFile("supabase/migrations/20261112100100_ig_being_the_best_seed.sql", "utf8");
ok(seed === buildSeedSql(data), "seed SQL identik dengan xlsx (jalankan npm run import:btb)");

// 2) bentuk data seperti dari ig_btb_list
const list: BtbList = {
  today: "2026-11-12",
  updated_at: null,
  notes: data.notes,
  programs: data.sections.flatMap((s: { key: "above" | "below"; programs: P[] }) =>
    s.programs.map((p) => ({
      code: p.code,
      section: s.key,
      name: p.name,
      due_week: p.dueWeek,
      items: p.items.map((i) => ({
        id: String(i.code),
        kind: i.kind as "activity" | "group",
        code: String(i.code),
        name: String(i.name),
        status: (i.status as string) ?? null,
        pic: (i.pic as string) ?? null,
        start: (i.start as string) ?? null,
        end: (i.end as string) ?? null,
        note: (i.note as string) ?? null,
      })),
    }))
  ),
};
const sections = shapeBtb(list);
const programs = sections.flatMap((s) => s.programs);
const acts = programs.flatMap(activitiesOf);

ok(sections.length === 2 && programs.length === 10 && acts.length === 59, `10 program, 59 aktivitas (dapat ${programs.length}/${acts.length})`);

// Header minggu: aturan halaman = header sheet Gantt (W1 Nov '26 2 Nov s.d. W3 Mar '27 15 Mar)
const weeks = weeksFor(datesOf(sections));
const key = (w: { start: string; label: string; month: string }) => `${w.start} ${w.label} ${w.month}`;
ok(weeks.map(key).join("|") === data.weeks.map(key).join("|"), `minggu halaman = header xlsx (${weeks.length} vs ${data.weeks.length})`);

// Label due dari tanggal = teks Due di file
for (const p of data.sections.flatMap((s: { programs: P[] }) => s.programs)) {
  ok(!p.dueWeek || weekLabel(p.dueWeek) === p.due, `${p.code} due ${p.dueWeek} -> "${p.dueWeek && weekLabel(p.dueWeek)}" = "${p.due}"`);
}

// Durasi & induk kelompok
ok(networkdays("2026-12-24", "2027-01-06") === 10, "A5.5 = 10 hari kerja (seperti file)");
ok(networkdays("2026-11-13", "2026-11-16") === 2, "Jumat s.d. Senin = 2");
const a312 = acts.find((a) => a.code === "A3.1.2");
ok(a312?.group === "A3.1", "A3.1.2 di bawah kelompok A3.1");
ok(acts.find((a) => a.code === "A1.1")?.group === null, "A1.1 tanpa kelompok");

// Lead time = kolom Ringkasan untuk program yang rentangnya sama (A1 1,3; B1 14,6; B5 8,6)
const lead = (c: string) => programSpan(programs.find((p) => p.code === c)!)?.leadWeeks;
ok(lead("A1") === 1.3 && lead("B1") === 14.6 && lead("B5") === 8.6, `lead time A1/B1/B5 = ${lead("A1")}/${lead("B1")}/${lead("B5")}`);

// Saran kode
const codes = programs.flatMap((p) => [p.code, ...p.items.map((i) => i.code)]);
ok(nextCode("A1", codes) === "A1.5", `nextCode A1 = ${nextCode("A1", codes)}`);
ok(nextCode("A3.1", codes) === "A3.1.5", `nextCode A3.1 = ${nextCode("A3.1", codes)}`);
ok(nextCode("A3", codes) === "A3.3", `nextCode A3 = ${nextCode("A3", codes)}`);
ok(nextProgramCode("above", programs.map((p) => p.code), ["A1"]) === "A6", "program baru Above = A6");

console.log(`being-the-best: ${programs.length} program, ${acts.length} aktivitas, ${weeks.length} minggu`);
if (fail) {
  console.log(`${fail} uji gagal`);
  process.exit(1);
}
console.log("being-the-best OK");

// Dibuat oleh Faiz Hazim Hawari · skill-analysis
