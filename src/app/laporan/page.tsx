import type { Metadata } from "next";
import { ArrowDownIcon, ArrowUpIcon, InfoIcon } from "@phosphor-icons/react/ssr";

import { PageIntro } from "@/components/page-intro";
import { RangePicker } from "@/components/range-picker";
import { Notice, Section } from "@/components/notice";
import { ReportActions } from "@/components/report-actions";
import { LifeAtPtpnLogo, PtpnLogo } from "@/components/shell/brand-logo";
import { PostThumb } from "@/components/post-thumb";
import { KindChip } from "@/components/kind-chip";
import { buildReport, type SummaryRow } from "@/lib/report";
import { fmtCompact, fmtDate, fmtDateTime, fmtInt, fmtPct, fmtRange, fmtSignedPct } from "@/lib/format";
import { KIND_LABEL, KIND_SWATCH } from "@/lib/kinds";
import { parseRange, rangeQuery } from "@/lib/range";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Laporan" };

function fmtValue(r: SummaryRow, v: number | null) {
  return r.format === "pct" ? fmtPct(v) : fmtInt(v);
}

/** Angka sorotan di sampul: diambil dari baris ringkasan yang sama dengan tabel & Excel. */
const HIGHLIGHT_KEYS = ["views", "total_interactions", "posts", "median_er"] as const;

/**
 * Perubahan vs periode sebelumnya: ikon + tanda + warna (tidak bergantung warna saja).
 * `onDark` untuk sampul gelap: memakai nilai token delta mode gelap (#8FC58C / #F28B82),
 * kontras ±8:1 dan ±7:1 di atas ink; saat dicetak kembali ke token mode terang.
 */
function Change({ change, className, onDark }: { change: number | null; className?: string; onDark?: boolean }) {
  const muted = onDark ? "text-ink-muted print:text-muted-foreground" : "text-muted-foreground";
  if (change === null) return <span className={cn("text-caption", muted, className)}>Tidak ada pembanding</span>;
  if (Math.abs(change) < 0.0005) return <span className={cn("text-caption tabular-nums", muted, className)}>Stabil</span>;
  const up = change > 0;
  const Icon = up ? ArrowUpIcon : ArrowDownIcon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-bold tabular-nums",
        onDark
          ? cn("bg-white/10 print:bg-transparent", up ? "text-[#8FC58C] print:text-delta-up" : "text-[#F28B82] print:text-delta-down")
          : up
            ? "bg-brand-green-soft text-delta-up"
            : "bg-destructive/10 text-delta-down",
        className
      )}
    >
      <Icon className="size-3" weight="bold" aria-hidden />
      {fmtSignedPct(change)}
      <span className="sr-only">{up ? "naik" : "turun"} dibanding periode sebelumnya</span>
    </span>
  );
}

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const range = parseRange(await searchParams);
  const report = await buildReport(range.from, range.to);
  const { overview: o, meta } = report;
  const top = report.posts.slice(0, 10);
  const username = meta.account?.username ?? "lifeatptpn";
  const highlights = HIGHLIGHT_KEYS.map((k) => report.summary.find((r) => r.key === k)).filter((r): r is SummaryRow => Boolean(r));
  const kindViewsTotal = o.kinds.reduce((s, k) => s + (k.views ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="no-print flex flex-col gap-5">
        <PageIntro
          title="Laporan"
          subtitle="Pilih periode, lalu unduh Excel atau cetak halaman ini untuk dikirim ke perusahaan. Angka di halaman dan di file Excel berasal dari perhitungan yang sama."
          actions={<ReportActions excelHref={`/api/laporan/excel?${rangeQuery(range)}`} />}
        >
          <div className="flex flex-col gap-1.5">
            <span className="text-caption font-medium text-muted-foreground">Periode laporan</span>
            <RangePicker key={`${range.from}-${range.to}`} from={range.from} to={range.to} />
          </div>
        </PageIntro>
        {range.notice ? <Notice tone="warning">{range.notice}</Notice> : null}
      </div>

      <article className="overflow-hidden rounded-card border border-border/70 bg-card shadow-card print:rounded-none print:border-0 print:shadow-none">
        {/* Sampul */}
        <header className="ink-glow relative flex flex-col gap-8 p-6 text-ink-foreground md:p-10 print:bg-none print:bg-transparent print:p-0 print:pb-6 print:text-foreground">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-5">
              <LifeAtPtpnLogo tone="onDark" className="w-20 md:w-24" />
              <span className="h-10 w-px bg-white/20 print:bg-border" aria-hidden />
              <PtpnLogo tone="onDark" className="w-20 md:w-24" />
            </div>
            <p className="text-caption text-ink-muted print:text-muted-foreground">
              Disusun {fmtDateTime(report.generatedAt)}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-body-sm font-medium text-ink-muted print:text-muted-foreground">Laporan performa Instagram</p>
            <h2 className="text-kpi leading-none font-bold tracking-tight md:text-display">@{username}</h2>
            <p className="max-w-[70ch] text-body text-ink-muted print:text-foreground">
              Periode <strong className="font-bold text-ink-foreground print:text-foreground">{fmtRange(o.range.from, o.range.to)}</strong> ({o.range.days}{" "}
              hari), dibandingkan {fmtRange(o.range.prev_from, o.range.prev_to)}. Data sinkron terakhir {fmtDateTime(meta.last_hourly_success)}.
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {highlights.map((r) => (
              <div key={r.key} className="flex flex-col-reverse gap-2 rounded-tile bg-white/8 p-4 print:border print:bg-transparent">
                <dt className="text-body-sm text-ink-muted print:text-muted-foreground">{r.label}</dt>
                <dd className="flex flex-col gap-1.5">
                  <span className="text-h4 leading-none font-bold tracking-tight tabular-nums" title={fmtValue(r, r.current)}>
                    {r.format === "pct" ? fmtPct(r.current) : fmtCompact(r.current)}
                  </span>
                  <Change change={r.change} className="w-fit" onDark />
                </dd>
              </div>
            ))}
          </dl>
        </header>

        <div className="flex flex-col gap-10 p-6 md:p-10 print:p-0 print:pt-8">
          <Section title="Ringkasan" description="Periode ini dibandingkan periode sebelumnya dengan panjang hari yang sama.">
            <div className="relative overflow-x-auto rounded-tile border border-border/70">
              <table className="w-full min-w-[36rem] text-body-sm">
                <thead>
                  <tr className="border-b bg-muted/60 text-left text-caption text-muted-foreground">
                    <th scope="col" className="px-4 py-3 font-semibold">Metrik</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Periode ini</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Sebelumnya</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Perubahan</th>
                  </tr>
                </thead>
                <tbody>
                  {report.summary.map((r) => (
                    <tr key={r.key} className="border-b border-border/60 last:border-0 even:bg-muted/25">
                      <th scope="row" className="px-4 py-3 text-left font-semibold">
                        {r.label}
                        {r.note ? <span className="block text-caption font-normal text-muted-foreground">{r.note}</span> : null}
                      </th>
                      <td className="px-4 py-3 text-right font-bold tabular-nums">{fmtValue(r, r.current)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">{fmtValue(r, r.previous)}</td>
                      <td className="px-4 py-3 text-right">
                        <Change change={r.change} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Performa per jenis konten" description="Postingan yang terbit pada periode ini. Bar = porsi views total.">
            {o.kinds.length ? (
              <div className="relative overflow-x-auto rounded-tile border border-border/70">
                <table className="w-full min-w-[40rem] text-body-sm">
                  <thead>
                    <tr className="border-b bg-muted/60 text-left text-caption text-muted-foreground">
                      <th scope="col" className="px-4 py-3 font-semibold">Jenis</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">Postingan</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Total views</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">Median views</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">Median ER</th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.kinds.map((k) => {
                      const share = kindViewsTotal > 0 && k.views !== null ? k.views / kindViewsTotal : null;
                      return (
                        <tr key={k.kind} className="border-b border-border/60 last:border-0 even:bg-muted/25">
                          <th scope="row" className="px-4 py-3 text-left font-semibold">
                            <span className="inline-flex items-center gap-2">
                              <span className={cn("size-3 rounded-[3px]", KIND_SWATCH[k.kind])} aria-hidden />
                              {KIND_LABEL[k.kind] ?? k.kind}
                            </span>
                          </th>
                          <td className="px-4 py-3 text-right tabular-nums">{fmtInt(k.posts)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className="w-20 shrink-0 text-right font-bold tabular-nums">{fmtInt(k.views)}</span>
                              <span className="flex h-2 min-w-24 flex-1" aria-hidden>
                                <span className={cn("block h-full rounded-r-[4px]", KIND_SWATCH[k.kind])} style={{ width: `${(share ?? 0) * 100}%` }} />
                              </span>
                              <span className="w-12 shrink-0 text-right text-caption text-muted-foreground tabular-nums">{fmtPct(share, 0, "")}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">{fmtInt(k.median_views)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{fmtPct(k.median_er)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-body-sm text-muted-foreground">Tidak ada postingan yang terbit pada periode ini.</p>
            )}
          </Section>

          <Section title="10 konten dengan views tertinggi">
            {top.length ? (
              <ol className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {top.map((post) => (
                  <li key={post.id} className="print-break-avoid grid grid-cols-[2rem_4rem_minmax(0,1fr)] items-center gap-3 rounded-tile border border-border/70 p-3">
                    <span
                      className={cn(
                        "inline-flex size-8 items-center justify-center rounded-full text-caption font-bold tabular-nums",
                        post.rank <= 3 ? "bg-brand-orange text-[#172019]" : "bg-muted"
                      )}
                    >
                      {post.rank}
                    </span>
                    <PostThumb src={post.thumb_url} alt={`Thumbnail ${KIND_LABEL[post.content_kind]}`} className="size-16 rounded-tile" />
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <p className="line-clamp-2 text-body-sm font-semibold">{post.caption?.trim() || "Tanpa caption"}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
                        <KindChip kind={post.content_kind} />
                        <span>{fmtDate(post.posted_at)}</span>
                        <span className="tabular-nums">
                          <strong className="text-body-sm font-bold text-foreground">{fmtInt(post.views)}</strong> views
                        </span>
                        <span className="tabular-nums">jangkauan {fmtInt(post.reach)}</span>
                        <span className="tabular-nums">ER {fmtPct(post.engagement_rate)}</span>
                        {post.permalink ? (
                          <a href={post.permalink} className="underline underline-offset-2 hover:text-foreground" target="_blank" rel="noopener noreferrer">
                            <span className="print:hidden">Buka post</span>
                            {/* Di kertas tautan tidak bisa diklik: cetak alamatnya. */}
                            <span className="hidden print:inline">{post.permalink.replace("https://www.", "")}</span>
                            <span className="sr-only"> di Instagram (tab baru)</span>
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-body-sm text-muted-foreground">Tidak ada postingan yang terbit pada periode ini.</p>
            )}
          </Section>

          <Section title="Catatan data">
            <div className="flex gap-3 rounded-tile bg-muted/60 p-5">
              <InfoIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
              <ul className="flex max-w-[80ch] list-disc flex-col gap-2 pl-4 text-body-sm text-muted-foreground">
                {report.caveats.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          </Section>
        </div>
      </article>
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-analysis
