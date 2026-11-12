// Membuat migrasi seed Being the Best dari xlsx.
//   npm run import:btb                 (default: data/timeline-being-the-best.xlsx)
//   npm run import:btb -- path/ke/file.xlsx
//
// Hasilnya supabase/migrations/20261112100100_ig_being_the_best_seed.sql. Seed hanya
// MENAMBAH program/aktivitas yang kodenya belum ada; yang sudah diubah dari web
// tidak ditimpa. Lihat README bagian "Menu Being the Best".

import { writeFile } from "node:fs/promises";
import { buildSeedSql, parseBeingTheBest } from "./being-the-best-parse.mjs";

const file = process.argv[2] ?? "data/timeline-being-the-best.xlsx";
const out = "supabase/migrations/20261112100100_ig_being_the_best_seed.sql";

const { data, warnings } = await parseBeingTheBest(file);
await writeFile(out, buildSeedSql(data));

const programs = data.sections.flatMap((s) => s.programs);
const acts = programs.flatMap((p) => p.items.filter((i) => i.kind === "activity"));
console.log(`${file} -> ${out}`);
console.log(`${data.sections.length} bagian, ${programs.length} program, ${acts.length} aktivitas, ${data.weeks.length} minggu, ${data.notes.length} catatan`);
if (warnings.length) {
  console.log(`\n${warnings.length} catatan dari isi file:`);
  for (const w of warnings) console.log(`  - ${w}`);
}

// Dibuat oleh Faiz Hazim Hawari · skill-analysis
