// Parser file "Timeline Being The Best" (xlsx) menjadi data halaman /being-the-best.
// Dipakai dua tempat supaya isinya pasti sama: scripts/import-being-the-best.mjs
// (menulis src/data/being-the-best.json) dan tests/being-the-best.test.mts
// (memastikan JSON yang di-commit masih identik dengan xlsx).
//
// Yang dibaca dari sheet "Gantt":
//   - judul (A1), minggu (baris bulan / W / tanggal Senin di atas header "No")
//   - bagian (ABOVE / BELOW THE LINE), program (kode A1, B2, ...; "Nama | Due: W3 Nov '26"),
//     sub-kelompok tanpa tanggal (A3.1, A4.2, ...), dan aktivitas (punya Start/End)
// Dari sheet "Ringkasan": daftar "Asumsi & catatan" (baris berawalan "1. ", "2. ", ...).
//
// Durasi TIDAK diambil dari kolom "Durasi (hari kerja)": di file, rumus NETWORKDAYS
// bergeser satu baris di beberapa program (aktivitas pertama kosong, baris judul
// program terisi). Durasi dihitung ulang dengan rumus yang sama (Senin s.d. Jumat,
// inklusif, tanpa daftar libur) dan selisih dengan nilai di file dilaporkan sebagai warning.

import ExcelJS from "exceljs";

const PROGRAM = /^[A-Z]\d+$/;
const CHILD = /^[A-Z]\d+(\.\d+)+$/;

/** Nilai sel: hasil rumus, teks rich text digabung, string di-trim. */
function val(cell) {
  let v = cell?.value;
  if (v && typeof v === "object" && !(v instanceof Date)) {
    if ("result" in v) v = v.result;
    else if ("richText" in v) v = v.richText.map((t) => t.text).join("");
    else if ("text" in v) v = v.text;
    else if ("sharedFormula" in v || "formula" in v) v = undefined;
  }
  if (typeof v === "string") {
    v = v.replace(/\s+/g, " ").trim();
    return v === "" ? null : v;
  }
  return v ?? null;
}

function ymd(v) {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  return null;
}

/** NETWORKDAYS(start, end) tanpa libur: Senin s.d. Jumat, kedua ujung ikut dihitung. */
export function networkdays(start, end) {
  const a = Date.parse(`${start}T00:00:00Z`);
  const b = Date.parse(`${end}T00:00:00Z`);
  if (b < a) return -networkdays(end, start);
  let n = 0;
  for (let t = a; t <= b; t += 86400000) {
    const dow = new Date(t).getUTCDay();
    if (dow !== 0 && dow !== 6) n++;
  }
  return n;
}

export async function parseBeingTheBest(file) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.getWorksheet("Gantt");
  if (!ws) throw new Error('Sheet "Gantt" tidak ditemukan');
  const warnings = [];

  // ---- header ---------------------------------------------------------------
  let headerRow = null;
  ws.eachRow((row, r) => {
    if (!headerRow && val(row.getCell(1)) === "No") headerRow = r;
  });
  if (!headerRow) throw new Error('Baris header "No" tidak ditemukan di sheet Gantt');

  const col = {};
  const weeks = [];
  ws.getRow(headerRow).eachCell((cell, c) => {
    const v = val(cell);
    if (typeof v === "string") col[v] = c;
    const monday = ymd(v);
    if (monday) {
      weeks.push({
        start: monday,
        month: val(ws.getRow(headerRow - 2).getCell(c)),
        label: val(ws.getRow(headerRow - 1).getCell(c)),
      });
    }
  });
  for (const need of ["No", "Aktivitas", "Tipe", "PIC", "Start", "End", "Keterangan"]) {
    if (!col[need]) throw new Error(`Kolom "${need}" tidak ditemukan di header sheet Gantt`);
  }
  const durCol = Object.keys(col).find((k) => k.startsWith("Durasi"));

  // ---- isi -------------------------------------------------------------------
  const sections = [];
  let section = null;
  let program = null;
  let group = null;

  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const code = val(row.getCell(col.No));
    const name = val(row.getCell(col.Aktivitas));
    if (typeof code !== "string") continue;

    if (/THE LINE$/i.test(code) && !name) {
      section = { key: /^ABOVE/i.test(code) ? "above" : /^BELOW/i.test(code) ? "below" : code.toLowerCase(), label: code, programs: [] };
      sections.push(section);
      program = null;
      group = null;
      continue;
    }
    if (!section) {
      warnings.push(`Baris ${r} (${code}) muncul sebelum ABOVE/BELOW THE LINE, dilewati`);
      continue;
    }

    if (PROGRAM.test(code)) {
      const [title, ...rest] = String(name ?? "").split("|");
      const dueText = rest.join("|").match(/Due:\s*(.+)$/i)?.[1]?.trim() ?? null;
      let dueWeek = null;
      if (dueText) {
        const m = dueText.match(/^(W\d)\s+(.+)$/);
        dueWeek = weeks.find((w) => m && w.label === m[1] && w.month === m[2])?.start ?? null;
        if (!dueWeek) warnings.push(`${code}: due "${dueText}" tidak cocok dengan minggu mana pun di header`);
      }
      program = { code, name: title.trim(), due: dueText, dueWeek, items: [] };
      section.programs.push(program);
      group = null;
      continue;
    }

    if (CHILD.test(code)) {
      if (!program || !code.startsWith(`${program.code}.`)) {
        warnings.push(`Baris ${r} (${code}) tidak berada di bawah program yang cocok, dilewati`);
        continue;
      }
      const start = ymd(val(row.getCell(col.Start)));
      const end = ymd(val(row.getCell(col.End)));
      const note = val(row.getCell(col.Keterangan));
      if (!start && !end) {
        group = { kind: "group", code, name: name ?? code, note: typeof note === "string" ? note : null };
        program.items.push(group);
        continue;
      }
      if (!start || !end) {
        warnings.push(`${code}: Start/End tidak lengkap (${start ?? "kosong"} s.d. ${end ?? "kosong"})`);
        continue;
      }
      if (end < start) warnings.push(`${code}: End (${end}) lebih awal dari Start (${start})`);
      const workdays = networkdays(start, end);
      const inFile = durCol ? val(row.getCell(col[durCol])) : null;
      if (typeof inFile !== "number") warnings.push(`${code}: kolom Durasi kosong di file, dihitung ${workdays} hari kerja`);
      else if (inFile !== workdays) warnings.push(`${code}: Durasi di file ${inFile}, hitungan NETWORKDAYS ${workdays}`);

      const status = val(row.getCell(col.Tipe));
      const pic = val(row.getCell(col.PIC));
      program.items.push({
        kind: "activity",
        code,
        name: name ?? code,
        status: typeof status === "string" ? status : null,
        pic: typeof pic === "string" ? pic : null,
        start,
        end,
        workdays,
        note: typeof note === "string" ? note : null,
        group: group && code.startsWith(`${group.code}.`) ? group.code : null,
      });
    }
  }

  // ---- catatan di sheet Ringkasan ------------------------------------------------
  const notes = [];
  const sum = wb.getWorksheet("Ringkasan");
  if (sum) {
    sum.eachRow((row) => {
      const v = val(row.getCell(1));
      if (typeof v === "string" && /^\d+\.\s/.test(v)) notes.push(v.replace(/^\d+\.\s*/, ""));
    });
  } else {
    warnings.push('Sheet "Ringkasan" tidak ditemukan, catatan dikosongkan');
  }

  // ---- cek rentang --------------------------------------------------------------
  if (weeks.length) {
    const axisEnd = new Date(Date.parse(`${weeks.at(-1).start}T00:00:00Z`) + 6 * 86400000).toISOString().slice(0, 10);
    for (const s of sections)
      for (const p of s.programs)
        for (const it of p.items)
          if (it.kind === "activity" && (it.start < weeks[0].start || it.end > axisEnd))
            warnings.push(`${it.code}: ${it.start} s.d. ${it.end} di luar rentang minggu header (${weeks[0].start} s.d. ${axisEnd})`);
  }

  return {
    data: { title: val(ws.getCell("A1")), sheet: ws.name, weeks, sections, notes },
    warnings,
  };
}

// ---- seed SQL ------------------------------------------------------------------
// Isi awal tabel ig.btb_* (migrasi seed). `on conflict do nothing`: menjalankan
// ulang tidak menimpa perubahan yang sudah dibuat dari web, hanya menambah kode
// yang belum ada. Catatan hanya diisi bila tabel catatan masih kosong.

export const STATUSES = ["Not Started", "On Progress", "Done"];

const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);

export function buildSeedSql(data, source = "data/timeline-being-the-best.xlsx") {
  const programs = [];
  const items = [];
  for (const s of data.sections) {
    if (s.key !== "above" && s.key !== "below") throw new Error(`Bagian "${s.label}" tidak dikenal (hanya ABOVE/BELOW THE LINE)`);
    for (const p of s.programs) {
      programs.push(`  (${q(p.code)}, ${q(s.key)}, ${q(p.name)}, ${p.dueWeek ? `date ${q(p.dueWeek)}` : "null"})`);
      for (const it of p.items) {
        if (it.kind === "group") {
          items.push(`  (${q(p.code)}, 'group', ${q(it.code)}, ${q(it.name)}, null, null, null, null, ${q(it.note)})`);
        } else {
          if (it.status && !STATUSES.includes(it.status)) throw new Error(`${it.code}: status "${it.status}" belum didukung (${STATUSES.join(", ")})`);
          items.push(
            `  (${q(p.code)}, 'activity', ${q(it.code)}, ${q(it.name)}, ${q(it.status)}, ${q(it.pic)}, date ${q(it.start)}, date ${q(it.end)}, ${q(it.note)})`
          );
        }
      }
    }
  }
  const notes = data.notes.map((n, i) => `  (${i + 1}, ${q(n)})`);
  return `-- ============================================================================
-- Being the Best: isi awal dari ${source}
-- DI-GENERATE oleh \`npm run import:btb\`. Jangan diedit tangan; npm test gagal
-- bila file ini tidak lagi sama dengan xlsx.
-- Tidak menimpa perubahan dari web (on conflict do nothing).
-- ============================================================================

insert into ig.btb_programs (code, section, name, due_week) values
${programs.join(",\n")}
on conflict (code) do nothing;

insert into ig.btb_items (program_code, kind, code, name, status, pic, start_date, end_date, note) values
${items.join(",\n")}
on conflict (code) do nothing;

insert into ig.btb_notes (sort, body)
select v.sort, v.body
from (values
${notes.join(",\n")}
) as v(sort, body)
where not exists (select 1 from ig.btb_notes);

-- Dibuat oleh Faiz Hazim Hawari · skill-analysis
`;
}

// Dibuat oleh Faiz Hazim Hawari · skill-analysis
