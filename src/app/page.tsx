import { CalendarBlankIcon, ChartLineUpIcon, ImagesSquareIcon, UsersThreeIcon } from "@phosphor-icons/react/ssr";

import BlurFade from "@/components/effects/blur-fade";
import { PageIntro } from "@/components/page-intro";
import { RangePicker } from "@/components/range-picker";
import { StatTile } from "@/components/stat-tile";
import { TrendCard } from "@/components/trend-card";
import { Notice } from "@/components/notice";
import { ContentMix } from "@/components/overview/content-mix";
import { PhotoCard } from "@/components/overview/photo-card";
import { ViewsWeekCard } from "@/components/overview/views-week-card";
import { SyncCountdownCard } from "@/components/overview/sync-countdown-card";
import { ErCard } from "@/components/overview/er-card";
import { TopPostsCard } from "@/components/overview/top-posts-card";
import { PostCalendarCard } from "@/components/overview/post-calendar";
import { PeriodDetails } from "@/components/overview/period-details";
import { UpcomingPlanCard } from "@/components/overview/upcoming-plan-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMeta, getOverview, getPostCalendar } from "@/lib/data";
import { getPlanUpcoming } from "@/lib/plan";
import { DataError } from "@/lib/supabase-server";
import type { PlanUpcoming } from "@/lib/plan-types";
import { fmtCompact, fmtInt, fmtPct, fmtRange } from "@/lib/format";
import { parseRange, rangeQuery } from "@/lib/range";

/** Sapaan menurut jam WIB saat halaman dibuat. */
function greeting(now = Date.now()) {
  const hour = new Date(now + 7 * 3600_000).getUTCHours();
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

const todayFmt = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long", year: "numeric" });
/** "Kamis, 17 September 2026" dalam WIB, bukan jam server. */
function todayLabel(now = Date.now()) {
  return todayFmt.format(new Date(now));
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const range = parseRange(await searchParams);
  const [o, meta, calendar, plan] = await Promise.all([
    getOverview(range.from, range.to),
    getMeta(),
    getPostCalendar(range.to),
    // Menu Rencana bisa saja belum dimigrasikan di database: kartunya menjelaskan
    // sebabnya, sementara sisa halaman tetap tampil.
    getPlanUpcoming(5)
      .then((d) => ({ data: d as PlanUpcoming | null, error: undefined as string | undefined }))
      .catch((e) => ({
        data: null,
        error:
          e instanceof DataError && /ig_plan_upcoming|schema cache|does not exist|PGRST202/i.test(e.detail ?? "")
            ? "Menu Rencana belum aktif: jalankan migrasi supabase/migrations/20260918090000_ig_plan.sql di Supabase."
            : "Rencana terdekat gagal dimuat. Coba muat ulang halaman.",
      })),
  ]);
  const c = o.current;
  const p = o.previous;
  const daysWithData = c.days_with_data ?? 0;
  const prevDaysWithData = p.days_with_data ?? 0;
  // Persentase perubahan hanya jujur bila kedua periode datanya lengkap.
  const accountComparable = daysWithData >= range.days && prevDaysWithData >= range.days;
  const followersComparable = (c.new_followers_days ?? 0) >= range.days && (p.new_followers_days ?? 0) >= range.days;
  const cmp = (v: number | null | undefined) => (accountComparable ? v : null);
  const followerNet =
    o.followers.at_start && o.followers.at_end && o.followers.at_start.date !== o.followers.at_end.date
      ? o.followers.at_end.value - o.followers.at_start.value
      : null;
  const query = rangeQuery(range);
  const account = meta.account;

  return (
    <BlurFade>
      <div className="flex flex-col gap-6">
        <PageIntro
          title={
            <>
              {greeting()}, tim <span className="text-brand-green-strong">Life at PTPN</span>
            </>
          }
          eyebrow={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/80 px-3 py-1">
              <CalendarBlankIcon className="size-3.5" aria-hidden />
              {todayLabel()}
            </span>
          }
          subtitle={<>Performa @{account?.username ?? "lifeatptpn"} pada {fmtRange(range.from, range.to)}.</>}
          stats={[
            {
              label: "Follower",
              value: fmtCompact(account?.followers_count),
              icon: UsersThreeIcon,
              title: `${fmtInt(account?.followers_count)} follower`,
            },
            {
              label: "Views akun",
              value: fmtCompact(c.views),
              icon: ChartLineUpIcon,
              title: `${fmtInt(c.views)} views pada rentang ini`,
            },
            {
              label: "Post terbit",
              value: fmtInt(o.posts_current.posts ?? 0),
              icon: ImagesSquareIcon,
            },
          ]}
        >
          <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between 2xl:gap-10">
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-caption font-medium text-muted-foreground">Rentang tanggal</span>
              <RangePicker key={`${range.from}-${range.to}`} from={range.from} to={range.to} />
            </div>
            <div className="w-full min-w-0 2xl:max-w-xl">
              <ContentMix kinds={o.kinds} />
            </div>
          </div>
        </PageIntro>

        {range.notice ? <Notice tone="warning">{range.notice}</Notice> : null}
        {daysWithData < range.days ? (
          <Notice tone="warning">
            Metrik harian akun baru tersedia <strong>{daysWithData} dari {range.days} hari</strong> pada rentang ini.
            Histori diisi otomatis dari Instagram secara bertahap, jadi total belum mewakili periode penuh.
          </Notice>
        ) : null}
        {!accountComparable && daysWithData > 0 ? (
          <Notice>
            Persentase perubahan metrik akun disembunyikan karena periode pembanding ({fmtRange(o.range.prev_from, o.range.prev_to)})
            baru punya data <strong>{prevDaysWithData} dari {range.days} hari</strong>.
          </Notice>
        ) : null}

        {/* Bento baris 1 */}
        <section aria-label="Sorotan" className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
          <PhotoCard
            username={account?.username ?? "lifeatptpn"}
            name={account?.name ?? null}
            followers={account?.followers_count ?? null}
          />
          <ViewsWeekCard series={o.series} href="#tren" />
          <SyncCountdownCard lastSuccess={meta.last_hourly_success} />
          <ErCard medianEr={o.posts_current.median_er ?? null} kinds={o.kinds} />
        </section>

        {/* Bento baris 2 */}
        <section aria-label="Aktivitas" className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
          <div className="md:col-span-2 *:h-full 2xl:order-2">
            <PostCalendarCard calendar={calendar} query={query} />
          </div>
          <div className="*:h-full 2xl:order-1">
            <PeriodDetails overview={o} followerNet={followerNet} />
          </div>
          <div className="*:h-full 2xl:order-3">
            <TopPostsCard posts={o.top_posts} totalPosts={o.posts_current.posts ?? 0} query={query} />
          </div>
        </section>

        <UpcomingPlanCard data={plan.data} error={plan.error} />

        {/* Angka utama + perbandingan */}
        <section aria-label="Angka utama" className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          <StatTile
            label="Rata-rata jangkauan harian"
            value={fmtCompact(c.reach_avg_daily)}
            current={c.reach_avg_daily}
            previous={cmp(p.reach_avg_daily)}
            note="akun unik per hari"
          />
          <StatTile
            label="Interaksi konten"
            value={fmtCompact(c.total_interactions)}
            current={c.total_interactions}
            previous={cmp(p.total_interactions)}
          />
          <StatTile
            label="Follower baru"
            value={fmtInt(c.new_followers)}
            current={c.new_followers_days ? c.new_followers : undefined}
            previous={followersComparable ? p.new_followers : null}
            note={
              c.new_followers_days && c.new_followers_days < range.days
                ? `data ${c.new_followers_days} dari ${range.days} hari`
                : undefined
            }
          />
          <StatTile
            label="Median views per post"
            value={fmtCompact(o.posts_current.median_views)}
            current={o.posts_current.median_views}
            previous={o.posts_previous.median_views}
            note={`ER median ${fmtPct(o.posts_current.median_er, 1)}`}
          />
        </section>

        <Card id="tren" className="scroll-mt-24">
          <CardHeader>
            <CardTitle>Tren harian</CardTitle>
            <CardDescription>
              Hari mengikuti batas hari Meta (pukul 14.00 atau 15.00 WIB), sehingga angka per tanggal bisa sedikit
              berbeda dari hitungan kalender WIB.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TrendCard series={o.series} />
          </CardContent>
        </Card>
      </div>
    </BlurFade>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
