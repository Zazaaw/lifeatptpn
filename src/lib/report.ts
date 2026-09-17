import "server-only";

import { getContent, getMeta, getOverview, type ContentRow, type DashboardMeta, type Overview } from "./data";
import { pctChange } from "./format";

/**
 * Satu sumber angka untuk halaman Laporan dan file Excel. Halaman dan file
 * memanggil fungsi ini dengan rentang yang sama, sehingga total di layar
 * dan di file tidak mungkin berbeda.
 */

export type SummaryRow = {
  key: string;
  label: string;
  current: number | null;
  previous: number | null;
  change: number | null;
  format: "int" | "pct";
  note?: string;
};

export type ReportModel = {
  range: Overview["range"];
  generatedAt: string;
  meta: DashboardMeta;
  overview: Overview;
  summary: SummaryRow[];
  posts: ContentRow[];
  postsTruncated: boolean;
  caveats: string[];
};

const MAX_POSTS = 500;

const n = (v: number | null | undefined) => (typeof v === "number" ? v : null);

export async function buildReport(from: string, to: string): Promise<ReportModel> {
  const [meta, overview, content] = await Promise.all([
    getMeta(),
    getOverview(from, to),
    getContent({ from, to, sort: "views", limit: MAX_POSTS, offset: 0 }),
  ]);
  const c = overview.current;
  const p = overview.previous;
  const pc = overview.posts_current;
  const pp = overview.posts_previous;

  const days = overview.range.days;
  // Sama seperti halaman Ringkasan: perubahan % metrik akun hanya ditampilkan
  // bila kedua periode punya data harian lengkap.
  const accountComparable = (c.days_with_data ?? 0) >= days && (p.days_with_data ?? 0) >= days;
  const followersComparable = (c.new_followers_days ?? 0) >= days && (p.new_followers_days ?? 0) >= days;

  const row = (
    key: string,
    label: string,
    current: number | null | undefined,
    previous: number | null | undefined,
    format: SummaryRow["format"] = "int",
    note?: string,
    comparable = true
  ): SummaryRow => ({
    key,
    label,
    current: n(current),
    previous: n(previous),
    change: comparable ? pctChange(n(current), n(previous)) : null,
    format,
    note,
  });

  const summary: SummaryRow[] = [
    row("views", "Views akun", c.views, p.views, "int", undefined, accountComparable),
    row("reach_avg_daily", "Rata-rata jangkauan harian", c.reach_avg_daily, p.reach_avg_daily, "int", "akun unik per hari, tidak dijumlah", accountComparable),
    row("total_interactions", "Interaksi konten", c.total_interactions, p.total_interactions, "int", undefined, accountComparable),
    row("likes", "Suka", c.likes, p.likes, "int", undefined, accountComparable),
    row("comments", "Komentar", c.comments, p.comments, "int", undefined, accountComparable),
    row("shares", "Dibagikan", c.shares, p.shares, "int", undefined, accountComparable),
    row("saves", "Disimpan (bersih)", c.saves, p.saves, "int", "simpan dikurangi batal simpan", accountComparable),
    row("profile_views", "Kunjungan profil", c.profile_views, p.profile_views, "int", undefined, accountComparable),
    row("website_clicks", "Ketukan tautan website", c.website_clicks, p.website_clicks, "int", undefined, accountComparable),
    row(
      "new_followers",
      "Follower baru",
      c.new_followers_days ? c.new_followers : null,
      p.new_followers_days ? p.new_followers : null,
      "int",
      "Meta hanya menyimpan 30 hari terakhir",
      followersComparable
    ),
    row("posts", "Postingan dipublikasi", pc.posts ?? 0, pp.posts ?? 0),
    row("median_views", "Median views per postingan", pc.median_views, pp.median_views),
    row("median_er", "Median engagement rate", pc.median_er, pp.median_er, "pct"),
  ];

  const caveats: string[] = [];
  if (!accountComparable) {
    caveats.push(
      `Metrik harian akun tersedia ${c.days_with_data ?? 0} dari ${days} hari pada periode ini dan ${p.days_with_data ?? 0} dari ${days} hari pada periode pembanding. Histori diisi bertahap sejak sistem mulai berjalan, dan persentase perubahan metrik akun tidak dihitung sampai kedua periode lengkap.`
    );
  }
  caveats.push(
    "Metrik akun (views, jangkauan, interaksi, kunjungan profil) memakai batas hari Meta, yaitu tengah malam waktu Pasifik (pukul 14.00 atau 15.00 WIB).",
    "Metrik postingan memakai tanggal posting WIB. Views dan interaksi postingan adalah angka kumulatif sampai sinkron terakhir, sehingga postingan lama punya waktu tayang lebih panjang daripada postingan baru.",
    "Engagement rate = (suka + komentar + simpan + share) dibagi jangkauan postingan.",
    "Instagram tidak menyediakan riwayat jumlah follower; perubahan jumlah follower hanya bisa dihitung sejak sistem mencatat."
  );

  return {
    range: overview.range,
    generatedAt: new Date().toISOString(),
    meta,
    overview,
    summary,
    posts: content.rows,
    postsTruncated: content.total > content.rows.length,
    caveats,
  };
}

// Dibuat oleh Faiz Hazim Hawari · skill-analysis
