import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowSquareOutIcon,
  ArrowUpRightIcon,
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ChatCircleIcon,
  CrownSimpleIcon,
  EyeIcon,
  ImagesSquareIcon,
} from "@phosphor-icons/react/ssr";

import BlurFade from "@/components/effects/blur-fade";
import { PageIntro } from "@/components/page-intro";
import { buttonVariants } from "@/components/ui/button-variants";
import { RangePicker } from "@/components/range-picker";
import { QueryPills, QuerySelect } from "@/components/query-filters";
import { EmptyState, Notice } from "@/components/notice";
import { PostThumb } from "@/components/post-thumb";
import { KindChip } from "@/components/kind-chip";
import { getContent, SORTS, type ContentRow, type SortKey } from "@/lib/data";
import { fmtCompact, fmtDateTime, fmtInt, fmtPct, fmtRange, isNum } from "@/lib/format";
import { isKind, KIND_LABEL } from "@/lib/kinds";
import { parseRange, pickString, rangeQuery } from "@/lib/range";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Konten" };

const PAGE_SIZE = 30;
/** Jumlah post yang ditampilkan sebagai sorotan di atas tabel (halaman 1 saja). */
const SPOTLIGHT = 3;

const KIND_OPTIONS = [
  { value: "", label: "Semua" },
  { value: "reels", label: "Reels" },
  { value: "carousel", label: "Carousel" },
  { value: "foto", label: "Foto" },
  { value: "story", label: "Story" },
] as const;

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "views", label: "Views total" },
  { value: "views_24h", label: "Views 24 jam pertama" },
  { value: "views_7d", label: "Views 7 hari pertama" },
  { value: "engagement_rate", label: "Engagement rate" },
  { value: "reach", label: "Jangkauan" },
  { value: "shares", label: "Dibagikan" },
  { value: "saves", label: "Disimpan" },
  { value: "comments", label: "Komentar terbanyak" },
  { value: "posted_at", label: "Terbaru" },
];

/** Angka utama yang disorot sesuai urutan yang dipilih. "Terbaru" menyorot views. */
function headlineOf(row: ContentRow, sort: SortKey): { label: string; value: string } {
  switch (sort) {
    case "views_24h":
      return { label: "views 24 jam pertama", value: fmtCompact(row.views_24h, "Belum ada") };
    case "views_7d":
      return { label: "views 7 hari pertama", value: fmtCompact(row.views_7d, "Belum ada") };
    case "engagement_rate":
      return { label: "engagement rate", value: fmtPct(row.engagement_rate, 2, "Tidak tersedia") };
    case "reach":
      return { label: "akun dijangkau", value: fmtCompact(row.reach) };
    case "shares":
      return { label: "kali dibagikan", value: fmtCompact(row.shares) };
    case "saves":
      return { label: "kali disimpan", value: fmtCompact(row.saves) };
    case "comments":
      return { label: "komentar", value: fmtCompact(row.comments_count) };
    default:
      return { label: "views", value: fmtCompact(row.views) };
  }
}

/** Kolom tabel yang sedang dipakai mengurutkan (diberi latar & ikon). */
const SORT_COLUMN: Partial<Record<SortKey, string>> = {
  views: "views",
  views_24h: "views_24h",
  reach: "reach",
  engagement_rate: "er",
  comments: "comments",
  shares: "shares",
  saves: "saves",
};

export default async function KontenPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const range = parseRange(sp);
  const kindParam = pickString(sp.kind);
  const kind = isKind(kindParam) ? kindParam : null;
  const sortParam = pickString(sp.sort);
  const sort: SortKey = (SORTS as readonly string[]).includes(sortParam ?? "") ? (sortParam as SortKey) : "views";
  const pageNum = Math.max(1, Number.parseInt(pickString(sp.page) ?? "1", 10) || 1);

  const data = await getContent({
    from: range.from,
    to: range.to,
    kind,
    sort,
    limit: PAGE_SIZE,
    offset: (pageNum - 1) * PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const firstShown = data.total === 0 ? 0 : data.offset + 1;
  const lastShown = data.offset + data.rows.length;
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)!.label;
  const missingSort = data.total - data.with_sort_value;

  const pageHref = (n: number) =>
    `/konten?${rangeQuery(range, { kind: kind ?? undefined, sort: sort === "views" ? undefined : sort, page: n > 1 ? String(n) : undefined })}`;
  const detailQuery = rangeQuery(range);

  // Nomor halaman di luar jangkauan (tautan lama, filter berubah): arahkan ke
  // halaman terakhir yang ada, jangan tampilkan "29.941 s.d. 29.940 dari 15".
  if (pageNum > totalPages) redirect(pageHref(totalPages));

  // Sorotan hanya di halaman 1 dan hanya bila post pertama punya angka urutan
  // (mis. urut "Views 24 jam" saat belum ada post yang punya angka itu: tidak disorot).
  const spotlight =
    pageNum === 1 && data.rows.length > SPOTLIGHT && data.with_sort_value >= SPOTLIGHT ? data.rows.slice(0, SPOTLIGHT) : [];
  const tableRows = data.rows.slice(spotlight.length);
  // Skala bar per tabel (tanpa sumbu): membandingkan baris yang tampil di tabel saja.
  const maxViews = Math.max(1, ...tableRows.map((r) => r.views ?? 0));
  const activeCol = SORT_COLUMN[sort];
  const pageViews = data.rows.reduce((s, r) => s + (r.views ?? 0), 0);
  const pageComments = data.rows.reduce((s, r) => s + (r.comments_count ?? 0), 0);

  return (
    <BlurFade>
      <div className="flex flex-col gap-6">
        <PageIntro
          title="Konten"
          subtitle={<>Postingan yang terbit pada {fmtRange(range.from, range.to)} (tanggal posting WIB), diurutkan menurut {sortLabel.toLowerCase()}.</>}
          stats={[
            { label: "Post", value: fmtInt(data.total), icon: ImagesSquareIcon },
            {
              label: totalPages > 1 ? "Views halaman ini" : "Total views",
              value: fmtCompact(pageViews),
              icon: EyeIcon,
              title: `${fmtInt(pageViews)} views dari post yang tampil`,
            },
            { label: totalPages > 1 ? "Komentar halaman ini" : "Komentar", value: fmtCompact(pageComments), icon: ChatCircleIcon, title: `${fmtInt(pageComments)} komentar` },
          ]}
        >
          {/* Satu baris filter di atas semua isi (dataviz: filter tidak di dalam kartu chart). */}
          <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-caption font-medium text-muted-foreground">Rentang tanggal posting</span>
            <RangePicker key={`${range.from}-${range.to}`} from={range.from} to={range.to} presetDays={[7, 28, 90, 365]} />
          </div>
          <div className="flex min-w-0 flex-wrap items-end gap-4">
            <QueryPills name="kind" label="Jenis konten" options={KIND_OPTIONS} value={kind ?? ""} />
            <QuerySelect id="sort" name="sort" label="Urutkan" options={SORT_OPTIONS} value={sort} />
          </div>
          </div>
        </PageIntro>

        {range.notice ? <Notice tone="warning">{range.notice}</Notice> : null}
        {pickString(sp.kind) && !kind ? <Notice tone="warning">Jenis konten di alamat halaman tidak dikenal, jadi semua jenis ditampilkan.</Notice> : null}

        {(sort === "views_24h" || sort === "views_7d") && missingSort > 0 ? (
          <Notice>
            {sortLabel} hanya bisa dihitung untuk post yang dipantau sejak awal tayang (sistem mulai mencatat 17 Sep 2026).{" "}
            <strong>{missingSort} dari {data.total} post</strong> belum punya angka ini dan ditaruh di bagian bawah.
          </Notice>
        ) : null}

        {data.total === 0 ? (
          <EmptyState title="Tidak ada postingan pada filter ini">
            Coba perluas rentang tanggal atau pilih jenis konten lain.
          </EmptyState>
        ) : (
          <>
            {spotlight.length ? (
              <section aria-labelledby="sorotan-title" className="flex flex-col gap-3">
                <h2 id="sorotan-title" className="flex items-center gap-2 text-lead font-bold tracking-tight">
                  <CrownSimpleIcon className="size-5 text-brand-orange" weight="fill" aria-hidden />
                  {SPOTLIGHT} teratas menurut {sortLabel.toLowerCase()}
                </h2>
                <ol className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[1.35fr_1fr_1fr]">
                  {spotlight.map((row, i) => (
                    <SpotlightCard key={row.id} row={row} sort={sort} query={detailQuery} lead={i === 0} className={i === 0 ? "md:col-span-2 xl:col-span-1" : undefined} />
                  ))}
                </ol>
              </section>
            ) : null}

            {tableRows.length ? (
              <>
                {/* Desktop: tabel */}
                <div className="relative hidden overflow-x-auto rounded-card border border-border/70 bg-card/85 shadow-card md:block">
                  <table className="w-full min-w-[56rem] text-body-sm">
                    <thead>
                      <tr className="border-b text-left text-caption text-muted-foreground">
                        <th scope="col" className="py-4 pr-2 pl-5 font-semibold">#</th>
                        <th scope="col" className="px-3 py-4 font-semibold">Konten</th>
                        <Th col="views" active={activeCol}>Views</Th>
                        <Th col="views_24h" active={activeCol}>24 jam</Th>
                        <Th col="reach" active={activeCol}>Jangkauan</Th>
                        <Th col="er" active={activeCol}>ER</Th>
                        <Th col="comments" active={activeCol}>Komentar</Th>
                        <Th col="shares" active={activeCol}>Share</Th>
                        <Th col="saves" active={activeCol} className="pr-5">Simpan</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((row) => (
                        <tr key={row.id} className="group border-b border-border/60 align-middle last:border-0 hover:bg-accent/40">
                          <td className="py-3 pr-2 pl-5">
                            <span className="inline-flex size-8 items-center justify-center rounded-full bg-muted text-caption font-bold tabular-nums">
                              {row.rank}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <ContentCell row={row} query={detailQuery} />
                          </td>
                          <td className={cn("px-3 py-3 text-right", activeCol === "views" && "bg-brand-green-soft/45")}>
                            <span className="block font-bold tabular-nums whitespace-nowrap">{fmtInt(row.views, "Belum ada")}</span>
                            {isNum(row.views) ? (
                              <span className="mt-1.5 ml-auto flex w-28 justify-end" aria-hidden>
                                <span className="block h-1.5 rounded-full bg-chart-1" style={{ width: `${Math.max(4, (row.views / maxViews) * 100)}%` }} />
                              </span>
                            ) : null}
                          </td>
                          <Num v={row.views_24h} active={activeCol === "views_24h"} />
                          <Num v={row.reach} active={activeCol === "reach"} />
                          <td className={cn("px-3 py-3 text-right whitespace-nowrap tabular-nums", activeCol === "er" && "bg-brand-green-soft/45 font-bold")}>
                            {fmtPct(row.engagement_rate, 2, "Tidak tersedia")}
                          </td>
                          <Num v={row.comments_count} active={activeCol === "comments"} />
                          <Num v={row.shares} active={activeCol === "shares"} />
                          <Num v={row.saves} active={activeCol === "saves"} className="pr-5" />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile: kartu */}
                <ul className="flex flex-col gap-3 md:hidden">
                  {tableRows.map((row) => (
                    <li key={row.id} className="rounded-card border border-border/70 bg-card/85 p-4 shadow-card">
                      <ContentCell row={row} query={detailQuery} />
                      <dl className="mt-3 grid grid-cols-3 gap-3 rounded-tile bg-muted/60 p-3 text-body-sm">
                        <Stat label="Views" value={fmtCompact(row.views)} />
                        <Stat label="ER" value={fmtPct(row.engagement_rate, 1)} />
                        <Stat label="Komentar" value={fmtCompact(row.comments_count, "Tidak tersedia")} />
                      </dl>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            <nav aria-label="Halaman" className="no-print flex flex-wrap items-center justify-between gap-3">
              <p className="text-body-sm text-muted-foreground tabular-nums">
                Menampilkan {fmtInt(firstShown)} s.d. {fmtInt(lastShown)} dari {fmtInt(data.total)} post
              </p>
              <div className="flex items-center gap-2">
                {pageNum > 1 ? (
                  <Link href={pageHref(pageNum - 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    <CaretLeftIcon aria-hidden /> Sebelumnya
                  </Link>
                ) : null}
                <span className="text-body-sm font-medium tabular-nums">
                  Halaman {pageNum} dari {totalPages}
                </span>
                {pageNum < totalPages ? (
                  <Link href={pageHref(pageNum + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    Berikutnya <CaretRightIcon aria-hidden />
                  </Link>
                ) : null}
              </div>
            </nav>
          </>
        )}
      </div>
    </BlurFade>
  );
}

/**
 * Kartu sorotan: gambar post asli, peringkat, angka urutan besar, dan tiga
 * angka pendukung. Kartu pertama memakai permukaan gelap supaya urutan
 * terbaca tanpa label tambahan di atas gambar.
 */
function SpotlightCard({
  row,
  sort,
  query,
  lead,
  className,
}: {
  row: ContentRow;
  sort: SortKey;
  query: string;
  lead: boolean;
  className?: string;
}) {
  const head = headlineOf(row, sort);
  const muted = lead ? "text-ink-muted" : "text-muted-foreground";
  const support = [
    { label: "Jangkauan", value: fmtCompact(row.reach) },
    { label: "ER", value: fmtPct(row.engagement_rate, 1) },
    { label: "Komentar", value: fmtCompact(row.comments_count) },
  ];
  return (
    <li
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-card p-3 transition-transform duration-300 hover:-translate-y-1 motion-reduce:transition-none",
        lead ? "ink-glow text-ink-foreground shadow-ink" : "border border-border/70 bg-card/85 shadow-card",
        className
      )}
    >
      <PostThumb
        src={row.thumb_url}
        alt={`Thumbnail ${KIND_LABEL[row.content_kind]}: ${row.caption?.slice(0, 60) ?? "tanpa caption"}`}
        className={cn("w-full rounded-tile", lead ? "aspect-[16/11]" : "aspect-[16/10]")}
      />
      <div className="flex flex-1 flex-col gap-3 px-2 pt-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={cn("text-caption font-medium", muted)}>Peringkat</p>
            <p className={cn("text-h4 leading-none font-bold tabular-nums", lead && "text-brand-orange")}>{row.rank}</p>
          </div>
          <div className="text-right">
            <p className="text-h4 leading-none font-bold tracking-tight tabular-nums lg:text-kpi">{head.value}</p>
            <p className={cn("mt-1 text-caption font-medium", muted)}>{head.label}</p>
          </div>
        </div>
        <Link
          href={`/konten/${row.id}?${query}`}
          className="line-clamp-2 text-body font-semibold outline-hidden after:absolute after:inset-0 after:rounded-card focus-visible:underline"
        >
          {row.caption?.trim() || "Tanpa caption"}
        </Link>
        <div className={cn("flex flex-wrap items-center gap-2 text-caption", muted)}>
          <KindChip kind={row.content_kind} />
          <span>{fmtDateTime(row.posted_at)}</span>
        </div>
        <dl className={cn("mt-auto grid grid-cols-3 gap-2 rounded-tile p-3", lead ? "bg-white/8" : "bg-muted/70")}>
          {support.map((s) => (
            <div key={s.label} className="min-w-0">
              <dt className={cn("text-caption", muted)}>{s.label}</dt>
              <dd className="text-body-sm font-bold tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <span
        className={cn(
          "pointer-events-none absolute top-5 right-5 inline-flex size-10 items-center justify-center rounded-full transition-transform duration-300 group-hover:rotate-45 motion-reduce:transition-none",
          lead ? "bg-brand-orange text-[#172019]" : "bg-card text-foreground shadow-sm"
        )}
        aria-hidden
      >
        <ArrowUpRightIcon className="size-4" weight="bold" />
      </span>
    </li>
  );
}

function Th({ col, active, children, className }: { col: string; active?: string; children: React.ReactNode; className?: string }) {
  const on = active === col;
  return (
    <th
      scope="col"
      aria-sort={on ? "descending" : undefined}
      className={cn("px-3 py-4 text-right font-semibold whitespace-nowrap", on && "bg-brand-green-soft/45 text-foreground", className)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {on ? <CaretDownIcon className="size-3.5" weight="bold" aria-hidden /> : null}
      </span>
    </th>
  );
}

function ContentCell({ row, query }: { row: ContentRow; query: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <PostThumb src={row.thumb_url} alt={`Thumbnail ${KIND_LABEL[row.content_kind]}`} className="size-16 shrink-0 rounded-tile" />
      <div className="min-w-0 max-w-[44ch]">
        <Link href={`/konten/${row.id}?${query}`} className="line-clamp-2 font-semibold hover:underline">
          {row.caption?.trim() || "Tanpa caption"}
        </Link>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-muted-foreground">
          <KindChip kind={row.content_kind} />
          <span>{fmtDateTime(row.posted_at)}</span>
          {row.permalink ? (
            <a
              href={row.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 hover:text-foreground"
            >
              Instagram <ArrowSquareOutIcon className="size-3" aria-hidden />
              <span className="sr-only">(tab baru)</span>
            </a>
          ) : null}
        </p>
      </div>
    </div>
  );
}

function Num({ v, active, className }: { v: number | null; active?: boolean; className?: string }) {
  return (
    <td
      className={cn(
        "px-3 py-3 text-right whitespace-nowrap tabular-nums",
        active && "bg-brand-green-soft/45 font-bold",
        v === null && "text-caption text-muted-foreground",
        className
      )}
      title={v === null ? "Belum ada data untuk post ini" : fmtInt(v)}
    >
      {v === null ? "Belum ada" : fmtInt(v)}
    </td>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className="font-bold tabular-nums">{value}</dd>
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
