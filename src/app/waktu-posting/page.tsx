import type { Metadata } from "next";
import type { Icon } from "@phosphor-icons/react";
import {
  CalendarDotsIcon,
  ClockIcon,
  ImagesSquareIcon,
  LightbulbFilamentIcon,
  SunHorizonIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/ssr";

import BlurFade from "@/components/effects/blur-fade";
import { PageIntro } from "@/components/page-intro";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RangePicker } from "@/components/range-picker";
import { QueryPills } from "@/components/query-filters";
import { EmptyState, Notice } from "@/components/notice";
import { Heatmap } from "@/components/charts/heatmap";
import { Columns } from "@/components/charts/columns";
import { HourColumns } from "@/components/charts/hour-columns";
import { BEST_TIME_METRICS, getBestTime, type BestTimeMetric } from "@/lib/data";
import { DAY_NAMES, DAY_SHORT, fmtCompact, fmtHourSlot, fmtInt, fmtPct, fmtRange } from "@/lib/format";
import { isKind } from "@/lib/kinds";
import { parseRange, pickString } from "@/lib/range";

export const metadata: Metadata = { title: "Waktu posting" };

const METRIC_OPTIONS = [
  { value: "", label: "Views (post ≥ 7 hari)" },
  { value: "views_24h", label: "Views 24 jam pertama" },
  { value: "engagement_rate", label: "Engagement rate" },
] as const;

const METRIC_NAME: Record<BestTimeMetric, string> = {
  views_mature: "median views",
  views_24h: "median views 24 jam pertama",
  engagement_rate: "median engagement rate",
};

const KIND_OPTIONS = [
  { value: "", label: "Semua" },
  { value: "reels", label: "Reels" },
  { value: "carousel", label: "Carousel" },
  { value: "foto", label: "Foto" },
] as const;

const METRIC_EXPLAIN: Record<BestTimeMetric, string> = {
  views_mature:
    "Views terbaru dari post yang sudah berumur minimal 7 hari. Setelah seminggu views sebuah post umumnya sudah hampir berhenti bertambah, jadi post lama dan baru bisa dibandingkan dengan adil.",
  views_24h:
    "Views pada umur 24 jam, dihitung dari catatan per jam. Paling adil untuk membandingkan jam posting, tetapi hanya tersedia untuk post yang terbit setelah sistem mulai mencatat (17 Sep 2026).",
  engagement_rate:
    "Engagement rate (suka + komentar + simpan + share dibagi jangkauan) dari post berumur minimal 48 jam. Mengukur kualitas respons, bukan jumlah penonton.",
};

const hh = (h: number) => String(h).padStart(2, "0");

export default async function WaktuPostingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const range = parseRange(sp, { defaultDays: 365 });
  const metricParam = pickString(sp.metric);
  const metric: BestTimeMetric = (BEST_TIME_METRICS as readonly string[]).includes(metricParam ?? "")
    ? (metricParam as BestTimeMetric)
    : "views_mature";
  const kindParam = pickString(sp.kind);
  const kind = isKind(kindParam) && kindParam !== "story" ? kindParam : null;

  const data = await getBestTime({ from: range.from, to: range.to, metric, kind });
  const isRate = metric === "engagement_rate";
  const fmt = (v: number | null) => (isRate ? fmtPct(v) : fmtCompact(v));

  const validCells = data.cells.filter((c) => c.valid).sort((a, b) => b.median - a.median);
  const [best, ...runnersUp] = validCells.slice(0, 3);
  const validDays = data.by_dow.filter((d) => d.valid).sort((a, b) => b.median - a.median);
  const validHours = data.by_hour.filter((h) => h.valid).sort((a, b) => b.median - a.median);
  const onlinePeak = data.online_followers.length
    ? data.online_followers.reduce((a, b) => (b.avg > a.avg ? b : a))
    : null;

  return (
    <BlurFade>
      <div className="flex flex-col gap-6">
        <PageIntro
          title="Waktu posting"
          subtitle={<>Hari dan jam posting (WIB) dengan performa terbaik untuk post yang terbit pada {fmtRange(range.from, range.to)}.</>}
          stats={[
            { label: "Post dianalisis", value: fmtInt(data.posts_with_value), icon: ImagesSquareIcon },
            {
              label: "Hari terbaik",
              value: validDays[0] ? DAY_SHORT[validDays[0].dow - 1] : "Belum ada",
              icon: CalendarDotsIcon,
              title: validDays[0] ? DAY_NAMES[validDays[0].dow - 1] : "Data belum cukup",
            },
            { label: "Jam terbaik", value: validHours[0] ? `${hh(validHours[0].hour)}.00` : "Belum ada", icon: ClockIcon },
          ]}
        >
          <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-caption font-medium text-muted-foreground">Rentang tanggal posting</span>
            <RangePicker key={`${range.from}-${range.to}`} from={range.from} to={range.to} presetDays={[90, 180, 365]} />
          </div>
          <div className="flex min-w-0 flex-wrap items-end gap-4">
            <QueryPills name="metric" label="Ukuran performa" options={METRIC_OPTIONS} value={metric === "views_mature" ? "" : metric} />
            <QueryPills name="kind" label="Jenis konten" options={KIND_OPTIONS} value={kind ?? ""} />
          </div>
          </div>
        </PageIntro>

        {range.notice ? <Notice tone="warning">{range.notice}</Notice> : null}

        {data.posts_with_value === 0 ? (
          <EmptyState title="Belum ada post yang bisa dianalisis">
            {data.posts_in_range === 0
              ? "Tidak ada post yang terbit pada rentang ini. Coba pilih 12 bulan."
              : metric === "views_24h"
                ? `Ada ${data.posts_in_range} post pada rentang ini, tetapi belum ada yang punya catatan views 24 jam. Angka ini mulai tersedia sehari setelah post baru terbit. Sementara itu gunakan ukuran "Views (post ≥ 7 hari)".`
                : `Ada ${data.posts_in_range} post pada rentang ini, tetapi belum ada yang cukup umur untuk ukuran ini.`}
          </EmptyState>
        ) : (
          <>
            {data.posts_with_value < 30 ? (
              <Notice tone="warning">
                Hanya <strong>{data.posts_with_value} post</strong> yang bisa dianalisis. Rekomendasi di bawah masih
                lemah; perluas rentang tanggal supaya lebih banyak slot mencapai {data.min_samples} post.
              </Notice>
            ) : null}

            {/* Sorotan: slot terbaik + tiga fakta pendukung */}
            <section aria-label="Rekomendasi" className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
              <div className="ink-glow relative flex min-h-80 flex-col overflow-hidden rounded-card p-6 text-ink-foreground shadow-ink md:p-8">
                <p className="flex items-center gap-2 text-body-sm font-medium text-ink-muted">
                  <SunHorizonIcon className="size-5 text-brand-orange" weight="fill" aria-hidden />
                  Slot hari dan jam terbaik, {METRIC_NAME[metric]}
                </p>
                {best ? (
                  <>
                    <div className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-2">
                      <p className="text-kpi leading-none font-bold tracking-tight md:text-display">{DAY_NAMES[best.dow - 1]}</p>
                      <p className="pb-1 text-h5 leading-none font-bold text-brand-orange tabular-nums md:text-h4">
                        {hh(best.hour)}.00 s.d. {hh(best.hour)}.59
                      </p>
                    </div>
                    <p className="mt-3 text-body text-ink-muted">
                      <span className="font-bold text-ink-foreground tabular-nums">{fmt(best.median)}</span> dari {best.n} post
                      pada slot ini. Median semua post {fmt(data.overall_median)}.
                    </p>
                    {runnersUp.length ? (
                      <ol className="mt-auto grid grid-cols-1 gap-2 pt-6 sm:grid-cols-2" aria-label="Slot berikutnya">
                        {runnersUp.map((c, i) => (
                          <li key={`${c.dow}-${c.hour}`} className="flex items-center gap-3 rounded-tile bg-white/8 p-3">
                            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-body-sm font-bold tabular-nums">
                              {i + 2}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-body-sm font-bold">
                                {DAY_NAMES[c.dow - 1]}, {fmtHourSlot(c.hour)}
                              </span>
                              <span className="block text-caption text-ink-muted tabular-nums">
                                {fmt(c.median)} dari {c.n} post
                              </span>
                            </span>
                          </li>
                        ))}
                      </ol>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-6 max-w-[52ch] text-body text-ink-muted">
                    Belum ada slot hari dan jam dengan minimal {data.min_samples} post. Ringkasan per hari dan per jam di
                    bawah memakai sampel yang lebih besar, jadi tetap bisa dibaca.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-1">
                <FactTile
                  icon={CalendarDotsIcon}
                  label="Hari terbaik"
                  value={validDays[0] ? DAY_NAMES[validDays[0].dow - 1] : "Data belum cukup"}
                  note={validDays[0] ? `${fmt(validDays[0].median)} dari ${validDays[0].n} post` : undefined}
                />
                <FactTile
                  icon={ClockIcon}
                  label="Jam terbaik"
                  value={validHours[0] ? fmtHourSlot(validHours[0].hour) : "Data belum cukup"}
                  note={validHours[0] ? `${fmt(validHours[0].median)} dari ${validHours[0].n} post` : undefined}
                />
                <FactTile
                  icon={UsersThreeIcon}
                  label="Follower paling ramai online"
                  value={onlinePeak ? fmtHourSlot(onlinePeak.hour) : "Belum ada data"}
                  note={onlinePeak ? `rata-rata ${fmtInt(onlinePeak.avg)} follower, 28 hari terakhir` : undefined}
                />
              </div>
            </section>

            <Notice>
              <strong>Cara membaca.</strong> {METRIC_EXPLAIN[metric]} Setiap slot memakai median (bukan rata-rata) supaya
              satu post viral tidak mendistorsi hasil, dan baru dianggap valid bila berisi minimal {data.min_samples} post.
            </Notice>

            <Card>
              <CardHeader>
                <CardTitle>Peta hari dan jam</CardTitle>
                <CardDescription>
                  {fmtInt(data.posts_with_value)} post dianalisis. Semakin gelap semakin tinggi {METRIC_NAME[metric]}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Heatmap cells={data.cells} metric={isRate ? "rate" : "views"} minSamples={data.min_samples} />
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_2fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Per hari</CardTitle>
                  <CardDescription>Kolom pudar berarti sampel kurang dari {data.min_samples} post.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Columns
                    valueLabel={METRIC_NAME[metric]}
                    highlightKey={validDays[0] ? String(validDays[0].dow) : null}
                    items={DAY_NAMES.map((name, i) => {
                      const d = data.by_dow.find((x) => x.dow === i + 1);
                      return {
                        key: String(i + 1),
                        label: DAY_SHORT[i],
                        fullLabel: name,
                        value: d?.median ?? null,
                        display: d ? fmt(d.median) : "Tidak ada",
                        note: d ? `${d.n} post` : undefined,
                        muted: !d?.valid,
                      };
                    })}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Per jam posting (WIB)</CardTitle>
                  <CardDescription>Titik kecil berarti belum pernah posting di jam itu.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Columns
                    valueLabel={METRIC_NAME[metric]}
                    labelEvery={3}
                    highlightKey={validHours[0] ? String(validHours[0].hour) : null}
                    items={Array.from({ length: 24 }, (_, h) => {
                      const d = data.by_hour.find((x) => x.hour === h);
                      return {
                        key: String(h),
                        label: hh(h),
                        fullLabel: `${fmtHourSlot(h)} WIB`,
                        value: d?.median ?? null,
                        display: d ? fmt(d.median) : "Tidak ada",
                        note: d ? `${d.n} post` : undefined,
                        muted: !d?.valid,
                      };
                    })}
                  />
                </CardContent>
              </Card>
            </div>
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LightbulbFilamentIcon className="size-5 text-brand-orange" weight="fill" aria-hidden />
              Jam follower sedang online
            </CardTitle>
            <CardDescription>
              Rata-rata jumlah follower yang aktif per jam (WIB) selama 28 hari terakhir yang tersedia dari Meta. Ini
              sinyal pendukung, tidak dipengaruhi rentang tanggal di atas.
              {onlinePeak ? ` Puncaknya pukul ${fmtHourSlot(onlinePeak.hour)}.` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.online_followers.length ? (
              <HourColumns data={data.online_followers} valueLabel="Rata-rata follower online" />
            ) : (
              <EmptyState title="Belum ada data jam online">Data ini diambil sekali sehari oleh sinkron harian.</EmptyState>
            )}
          </CardContent>
        </Card>
      </div>
    </BlurFade>
  );
}

function FactTile({
  icon: IconCmp,
  label,
  value,
  note,
}: {
  icon: Icon;
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-card border border-border/70 bg-card/85 p-5 shadow-card">
      <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-green-soft text-brand-green-strong">
        <IconCmp className="size-6" weight="bold" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-caption font-medium text-muted-foreground">{label}</p>
        <p className="text-lead font-bold tracking-tight tabular-nums">{value}</p>
        {note ? <p className="text-caption text-muted-foreground tabular-nums">{note}</p> : null}
      </div>
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-analysis
