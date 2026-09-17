import ExcelJS from "exceljs";

import { buildReport, type ReportModel } from "@/lib/report";
import { DataError } from "@/lib/supabase-server";
import { fmtDateTime, fmtRange } from "@/lib/format";
import { KIND_LABEL } from "@/lib/kinds";
import { parseRange } from "@/lib/range";

/**
 * Export laporan ke .xlsx (skill-analysis §12.3): judul + cakupan + waktu
 * dibuat, header tebal berwarna, lebar kolom mengikuti isi, freeze pane,
 * autofilter, format angka/persen/tanggal asli (bukan teks), baris total yang
 * sama dengan tampilan. Angka berasal dari buildReport() yang sama dengan halaman.
 */
export const dynamic = "force-dynamic";

const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF262626" } };
const TOTAL_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
const INT = "#,##0";
const PCT = "0.00%";
const CHANGE = "+0.0%;-0.0%;0.0%";

/** Tanggal WIB sebagai nilai tanggal Excel (Excel tidak mengenal zona waktu). */
function wibExcelDate(iso: string) {
  return new Date(new Date(iso).getTime() + 7 * 3600_000);
}

function ymdExcelDate(ymd: string) {
  return new Date(`${ymd}T00:00:00Z`);
}

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = HEADER_FILL;
  row.alignment = { vertical: "middle", wrapText: true };
  row.height = 22;
}

function titleBlock(ws: ExcelJS.Worksheet, report: ReportModel, title: string) {
  const username = report.meta.account?.username ?? "lifeatptpn";
  ws.addRow([`${title}: Instagram @${username}`]).font = { bold: true, size: 14 };
  ws.addRow([`Periode: ${fmtRange(report.range.from, report.range.to)} (${report.range.days} hari)`]);
  ws.addRow([`Pembanding: ${fmtRange(report.range.prev_from, report.range.prev_to)}`]);
  ws.addRow([`Dibuat: ${fmtDateTime(report.generatedAt)}. Data sinkron terakhir: ${fmtDateTime(report.meta.last_hourly_success)}.`]);
  ws.addRow([]);
}

function buildWorkbook(report: ReportModel) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "lifeatptpn-insight";
  wb.created = new Date(report.generatedAt);

  // ---------------- Ringkasan
  const sum = wb.addWorksheet("Ringkasan", { views: [{ state: "frozen", ySplit: 6 }] });
  titleBlock(sum, report, "Laporan performa");
  styleHeader(sum.addRow(["Metrik", "Periode ini", "Periode sebelumnya", "Perubahan", "Catatan"]));
  for (const r of report.summary) {
    const row = sum.addRow([r.label, r.current, r.previous, r.change, r.note ?? ""]);
    const fmt = r.format === "pct" ? PCT : INT;
    row.getCell(2).numFmt = fmt;
    row.getCell(3).numFmt = fmt;
    row.getCell(4).numFmt = CHANGE;
    if (r.current === null) row.getCell(2).value = "Tidak tersedia";
    if (r.previous === null) row.getCell(3).value = "Tidak tersedia";
    if (r.change === null) row.getCell(4).value = "Tidak ada pembanding";
  }
  sum.columns = [{ width: 32 }, { width: 18 }, { width: 20 }, { width: 22 }, { width: 44 }];

  // ---------------- Per jenis konten
  const kinds = wb.addWorksheet("Per jenis konten", { views: [{ state: "frozen", ySplit: 6 }] });
  titleBlock(kinds, report, "Performa per jenis konten");
  styleHeader(kinds.addRow(["Jenis", "Postingan", "Total views", "Median views", "Median engagement rate"]));
  for (const k of report.overview.kinds) {
    const row = kinds.addRow([KIND_LABEL[k.kind] ?? k.kind, k.posts, k.views, k.median_views, k.median_er]);
    [2, 3, 4].forEach((c) => (row.getCell(c).numFmt = INT));
    row.getCell(5).numFmt = PCT;
  }
  if (report.overview.kinds.length) {
    const total = kinds.addRow([
      "Total",
      report.overview.kinds.reduce((s, k) => s + k.posts, 0),
      report.overview.kinds.reduce((s, k) => s + (k.views ?? 0), 0),
    ]);
    total.font = { bold: true };
    total.fill = TOTAL_FILL;
    [2, 3].forEach((c) => (total.getCell(c).numFmt = INT));
  } else {
    kinds.addRow(["Tidak ada postingan yang terbit pada periode ini."]);
  }
  kinds.columns = [{ width: 18 }, { width: 12 }, { width: 16 }, { width: 16 }, { width: 24 }];

  // ---------------- Konten
  const content = wb.addWorksheet("Konten", { views: [{ state: "frozen", ySplit: 6, xSplit: 2 }] });
  titleBlock(content, report, "Daftar konten (urut views)");
  const headers = [
    "Peringkat", "Tanggal posting (WIB)", "Jenis", "Caption", "Views", "Views 24 jam pertama", "Views 7 hari pertama",
    "Jangkauan", "Suka", "Komentar", "Disimpan", "Dibagikan", "Total interaksi", "Engagement rate", "Tautan",
  ];
  const headerRow = content.addRow(headers);
  styleHeader(headerRow);
  const firstDataRow = headerRow.number + 1;
  for (const p of report.posts) {
    const row = content.addRow([
      p.rank,
      wibExcelDate(p.posted_at),
      KIND_LABEL[p.content_kind] ?? p.content_kind,
      (p.caption ?? "").replace(/\s+/g, " ").trim(),
      p.views, p.views_24h, p.views_7d, p.reach, p.likes, p.comments, p.saves, p.shares, p.total_interactions,
      p.engagement_rate,
      p.permalink ? { text: p.permalink, hyperlink: p.permalink } : "",
    ]);
    row.getCell(2).numFmt = "dd mmm yyyy hh:mm";
    for (let c = 5; c <= 13; c++) row.getCell(c).numFmt = INT;
    row.getCell(14).numFmt = PCT;
    row.getCell(4).alignment = { wrapText: false };
    if (p.permalink) row.getCell(15).font = { color: { argb: "FF1D4ED8" }, underline: true };
  }
  const lastDataRow = content.lastRow?.number ?? firstDataRow - 1;
  if (report.posts.length) {
    content.autoFilter = { from: { row: headerRow.number, column: 1 }, to: { row: lastDataRow, column: headers.length } };
    const total = content.addRow(["Total", "", "", `${report.posts.length} postingan`]);
    // Jumlah hanya untuk metrik yang aditif; jangkauan antar post tidak boleh dijumlah.
    for (const col of [5, 9, 10, 11, 12, 13]) {
      const letter = content.getColumn(col).letter;
      total.getCell(col).value = { formula: `SUBTOTAL(9,${letter}${firstDataRow}:${letter}${lastDataRow})` };
      total.getCell(col).numFmt = INT;
    }
    total.font = { bold: true };
    total.fill = TOTAL_FILL;
    if (report.postsTruncated) {
      content.addRow([`Catatan: hanya ${report.posts.length} postingan teratas yang dimuat.`]).font = { italic: true };
    }
  } else {
    content.addRow(["Tidak ada postingan yang terbit pada periode ini."]);
  }
  content.columns = [
    { width: 11 }, { width: 20 }, { width: 11 }, { width: 60 }, { width: 12 }, { width: 14 }, { width: 14 },
    { width: 12 }, { width: 10 }, { width: 11 }, { width: 11 }, { width: 11 }, { width: 14 }, { width: 14 }, { width: 44 },
  ];

  // ---------------- Harian
  const daily = wb.addWorksheet("Harian akun", { views: [{ state: "frozen", ySplit: 6 }] });
  titleBlock(daily, report, "Metrik harian akun");
  const dHeader = daily.addRow(["Tanggal (hari Meta)", "Views", "Jangkauan", "Interaksi konten", "Follower baru", "Jumlah follower"]);
  styleHeader(dHeader);
  for (const s of report.overview.series) {
    const row = daily.addRow([ymdExcelDate(s.date), s.views, s.reach, s.total_interactions, s.new_followers, s.followers_total]);
    row.getCell(1).numFmt = "dd mmm yyyy";
    for (let c = 2; c <= 6; c++) row.getCell(c).numFmt = INT;
  }
  daily.autoFilter = { from: { row: dHeader.number, column: 1 }, to: { row: daily.lastRow?.number ?? dHeader.number, column: 6 } };
  daily.columns = [{ width: 20 }, { width: 14 }, { width: 14 }, { width: 18 }, { width: 15 }, { width: 17 }];

  // ---------------- Catatan
  const notes = wb.addWorksheet("Catatan data");
  titleBlock(notes, report, "Catatan data");
  report.caveats.forEach((c, i) => {
    const row = notes.addRow([`${i + 1}. ${c}`]);
    row.alignment = { wrapText: true, vertical: "top" };
  });
  notes.columns = [{ width: 110 }];

  return wb;
}

export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const range = parseRange(params);
  if (range.notice) {
    return Response.json({ error: range.notice }, { status: 400 });
  }
  try {
    const report = await buildReport(range.from, range.to);
    const buffer = await buildWorkbook(report).xlsx.writeBuffer();
    const filename = `lifeatptpn-insight_${range.from}_${range.to}.xlsx`;
    return new Response(buffer as ArrayBuffer, {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    console.error("[excel]", e);
    const message = e instanceof DataError ? e.userMessage : "File gagal dibuat.";
    return Response.json({ error: message }, { status: 500 });
  }
}

// Dibuat oleh Faiz Hazim Hawari · skill-analysis
