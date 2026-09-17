// ============================================================================
// ig-sync — tarik data Instagram Graph API ke schema `ig`.
//
// Dipanggil pg_cron (lihat migrasi ig_cron):
//   ?mode=hourly  post + insight, story aktif, komentar, metrik harian akun (refresh + isi celah)
//   ?mode=daily   demografi, jam online follower, follower baru 30 hari, refresh token
//
// Keamanan: verify_jwt dimatikan karena anon key maganghub bersifat publik.
// Sebagai gantinya setiap request wajib membawa header x-sync-secret yang
// dicocokkan dengan Vault `ig_sync_secret`. Token Instagram hanya ada di Vault
// `ig_access_token` dan tidak pernah dikirim balik di respons atau log.
// ============================================================================
import postgres from "npm:postgres@3.4.5";

const API = "https://graph.instagram.com/v26.0";
const TZ_META = "America/Los_Angeles"; // batas hari insight akun versi Meta
const WIB_OFFSET_MS = 7 * 3600_000; // Asia/Jakarta, tanpa DST

const RECENT_HOURS = 168; // post < 7 hari: snapshot tiap jam
const ACCOUNT_REFRESH_DAYS = 3; // angka harian Meta masih bergerak ±48 jam
const ACCOUNT_BACKFILL_DAYS = 365; // histori akun yang diisi bertahap
const ACCOUNT_GAP_PER_RUN = 6; // 2 request per hari → maks 12 request per run
const TOKEN_REFRESH_AFTER_DAYS = 7;
const COMMENT_REQUEST_BUDGET = 30; // maks request komentar per run jam-an
const COMMENT_RECHECK_HOURS = 24; // post < 7 hari dicek ulang walau jumlah komentar sama

const MEDIA_METRICS = [
  "views", "reach", "likes", "comments", "saved", "shares", "total_interactions",
  "follows", "profile_visits", "profile_activity",
  "ig_reels_avg_watch_time", "ig_reels_video_view_total_time", "reels_skip_rate",
];
const STORY_METRICS = [
  "views", "reach", "replies", "shares", "total_interactions", "navigation", "follows", "profile_visits",
];
const DAY_METRICS = [
  "views", "reach", "accounts_engaged", "total_interactions", "likes", "comments",
  "shares", "saves", "replies", "profile_views", "website_clicks", "profile_links_taps",
];

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 3, idle_timeout: 20 });

type Json = Record<string, unknown>;

class Api {
  requests = 0;
  lastUsage: Json = {};
  constructor(private token: string) {}

  /**
   * GET ke Graph API. Satu kali coba ulang (jeda 2 detik) untuk timeout,
   * galat jaringan, dan 5xx: halaman 100 post + insight kadang lambat dari
   * sisi Meta. Galat 4xx (izin, parameter) tidak dicoba ulang.
   */
  async get(path: string, params: Record<string, string | number> = {}): Promise<Json> {
    const url = new URL(path.startsWith("http") ? path : `${API}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    url.searchParams.set("access_token", this.token);
    for (let attempt = 1; ; attempt++) {
      this.requests++;
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(45_000) });
        for (const h of ["x-app-usage", "x-business-use-case-usage"]) {
          const v = res.headers.get(h);
          if (v) this.lastUsage[h] = safeJson(v);
        }
        if (res.status >= 500 && attempt < 2) {
          await sleep(2000);
          continue;
        }
        const body = await res.json().catch(() => ({}));
        if (!res.ok || body.error) {
          const e = body.error ?? {};
          throw new ApiError(scrub(e.message ?? `HTTP ${res.status}`), e.code, res.status);
        }
        return body;
      } catch (e) {
        if (!(e instanceof ApiError) && attempt < 2) {
          await sleep(2000);
          continue;
        }
        throw e;
      }
    }
  }
}

class ApiError extends Error {
  constructor(message: string, public code?: number, public status?: number) {
    super(message);
  }
}

// Pesan galat Meta kadang memuat URL lengkap termasuk token.
function scrub(s: string) {
  return s.replace(/access_token=[^&\s"]+/g, "access_token=[redacted]");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function safeJson(s: string) {
  try { return JSON.parse(s); } catch { return s; }
}

function errMsg(e: unknown) {
  return scrub(e instanceof Error ? e.message : String(e));
}

// ---------------------------------------------------------------------------
// Tanggal & zona waktu
// ---------------------------------------------------------------------------
function tzOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(date);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - date.getTime();
}

/** Tanggal (YYYY-MM-DD) sebuah instant di zona tertentu. */
function dateIn(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(date);
}

function addDays(ymd: string, n: number) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Instant UTC untuk tengah malam `ymd` di zona `timeZone`. */
function zonedMidnight(ymd: string, timeZone: string) {
  const guess = new Date(`${ymd}T00:00:00Z`);
  const first = new Date(guess.getTime() - tzOffsetMs(guess, timeZone));
  return new Date(guess.getTime() - tzOffsetMs(first, timeZone));
}

function wibDate(d = new Date()) {
  return new Date(d.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Konversi respons
// ---------------------------------------------------------------------------
function insightValues(insights: Json | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  const data = (insights?.data ?? []) as Json[];
  for (const m of data) {
    const values = m.values as { value: unknown }[] | undefined;
    const v = values?.[0]?.value ?? (m.total_value as Json | undefined)?.value;
    if (typeof v === "number") out[m.name as string] = v;
  }
  return out;
}

const num = (o: Record<string, number>, k: string) => (k in o ? o[k] : null);

function snapshotRow(mediaId: string, postedAt: Date, now: Date, v: Record<string, number>) {
  return {
    media_id: mediaId,
    captured_at: now,
    post_age_hours: Math.max(0, Math.round(((now.getTime() - postedAt.getTime()) / 3600_000) * 100) / 100),
    views: num(v, "views"),
    reach: num(v, "reach"),
    likes: num(v, "likes"),
    comments: num(v, "comments"),
    saves: num(v, "saved"),
    shares: num(v, "shares"),
    total_interactions: num(v, "total_interactions"),
    follows: num(v, "follows"),
    profile_visits: num(v, "profile_visits"),
    profile_activity: num(v, "profile_activity"),
    replies: num(v, "replies"),
    navigation: num(v, "navigation"),
    reels_avg_watch_time_ms: num(v, "ig_reels_avg_watch_time"),
    reels_total_watch_time_ms: num(v, "ig_reels_video_view_total_time"),
    reels_skip_rate: num(v, "reels_skip_rate"),
    raw_json: v,
  };
}

const COMPARE_KEYS = ["views", "reach", "likes", "comments", "saves", "shares", "total_interactions"] as const;

// ---------------------------------------------------------------------------
// Langkah-langkah sync
// ---------------------------------------------------------------------------
async function syncProfile(api: Api) {
  const me = await api.get("/me", {
    fields: "user_id,username,name,account_type,followers_count,follows_count,media_count,profile_picture_url",
  });
  const accountId = String(me.user_id);
  await sql`
    insert into ig.accounts ${sql({
      id: accountId,
      app_scoped_id: String(me.id),
      username: String(me.username),
      name: (me.name as string) ?? null,
      account_type: (me.account_type as string) ?? null,
      followers_count: (me.followers_count as number) ?? null,
      follows_count: (me.follows_count as number) ?? null,
      media_count: (me.media_count as number) ?? null,
      profile_picture_url: (me.profile_picture_url as string) ?? null,
    })}
    on conflict (id) do update set
      app_scoped_id = excluded.app_scoped_id, username = excluded.username, name = excluded.name,
      account_type = excluded.account_type, followers_count = excluded.followers_count,
      follows_count = excluded.follows_count, media_count = excluded.media_count,
      profile_picture_url = excluded.profile_picture_url, updated_at = now()`;
  return { accountId, followersCount: me.followers_count as number | undefined };
}

async function syncMedia(api: Api, accountId: string, now: Date) {
  const items: Json[] = [];
  let next: string | undefined;
  let page = 0;
  do {
    const body = next
      ? await api.get(next)
      : await api.get("/me/media", {
        fields: `id,media_type,media_product_type,caption,permalink,media_url,thumbnail_url,timestamp,comments_count,like_count,insights.metric(${MEDIA_METRICS.join(",")})`,
        limit: 100,
      });
    items.push(...((body.data ?? []) as Json[]));
    next = (body.paging as Json | undefined)?.next as string | undefined;
    page++;
  } while (next && page < 20); // pengaman: 2.000 post

  let stories: Json[] = [];
  let storyError: string | null = null;
  try {
    const body = await api.get("/me/stories", {
      fields: `id,media_type,media_product_type,caption,permalink,media_url,thumbnail_url,timestamp,insights.metric(${STORY_METRICS.join(",")})`,
    });
    stories = (body.data ?? []) as Json[];
  } catch (e) {
    storyError = errMsg(e);
  }

  const all = [...items, ...stories];
  if (all.length === 0) return { media: 0, snapshots: 0, stories: 0, storyError };

  const mediaRows = all.map((m) => ({
    id: String(m.id),
    account_id: accountId,
    media_type: String(m.media_type),
    media_product_type: (m.media_product_type as string) ?? null,
    caption: (m.caption as string) ?? null,
    permalink: (m.permalink as string) ?? null,
    media_url: (m.media_url as string) ?? null,
    thumbnail_url: (m.thumbnail_url as string) ?? null,
    posted_at: new Date(String(m.timestamp)),
    last_synced_at: now,
    comments_count: typeof m.comments_count === "number" ? m.comments_count : null,
    like_count: typeof m.like_count === "number" ? m.like_count : null,
  }));

  await sql`
    insert into ig.media ${sql(mediaRows)}
    on conflict (id) do update set
      media_type = excluded.media_type, media_product_type = excluded.media_product_type,
      caption = excluded.caption, permalink = excluded.permalink, media_url = excluded.media_url,
      thumbnail_url = excluded.thumbnail_url, posted_at = excluded.posted_at,
      last_synced_at = excluded.last_synced_at,
      comments_count = coalesce(excluded.comments_count, ig.media.comments_count),
      like_count = coalesce(excluded.like_count, ig.media.like_count),
      updated_at = now()`;

  const ids = mediaRows.map((r) => r.id);
  const last = await sql`
    select distinct on (media_id) media_id, captured_at, ${sql(COMPARE_KEYS as unknown as string[])}
    from ig.media_snapshots where media_id in ${sql(ids)}
    order by media_id, captured_at desc`;
  const lastById = new Map(last.map((r) => [r.media_id as string, r]));

  const snapshots = [];
  let withoutInsights = 0;
  for (const m of all) {
    const values = insightValues(m.insights as Json | undefined);
    if (Object.keys(values).length === 0) {
      withoutInsights++; // mis. post dari sebelum akun jadi Business; jangan simpan baris kosong
      continue;
    }
    const postedAt = new Date(String(m.timestamp));
    const row = snapshotRow(String(m.id), postedAt, now, values);
    const prev = lastById.get(row.media_id);
    const isStory = m.media_product_type === "STORY";
    const isRecent = row.post_age_hours < RECENT_HOURS;
    // Post lama jarang berubah: simpan hanya bila angkanya bergerak, supaya
    // tabel tidak membengkak di project yang dipakai bersama.
    const changed = !prev || COMPARE_KEYS.some((k) => Number(prev[k] ?? -1) !== Number(row[k] ?? -1));
    if (isStory || isRecent || changed) snapshots.push(row);
  }

  if (snapshots.length) {
    for (let i = 0; i < snapshots.length; i += 200) {
      await sql`insert into ig.media_snapshots ${sql(snapshots.slice(i, i + 200))}`;
    }
  }
  return { media: items.length, stories: stories.length, snapshots: snapshots.length, withoutInsights, storyError };
}

/**
 * Komentar per post. Hanya post yang jumlah komentarnya berubah (atau post
 * < 7 hari yang belum dicek 24 jam) yang diambil ulang, dibatasi budget request.
 *
 * Tanpa izin `instagram_business_manage_comments` (atau app Meta masih mode
 * Development) API mengembalikan data kosong TANPA galat. Deteksinya: post
 * yang menurut API punya komentar tetapi dua halaman pertama kosong. Saat itu
 * langkah ini berhenti (tidak membuang budget) dan status dicatat di log.
 */
async function syncComments(api: Api, now: Date) {
  const candidates = await sql`
    select id, comments_count, comments_synced_for, comments_synced_at, posted_at
    from ig.media
    where content_kind <> 'story' and coalesce(comments_count, 0) > 0
      and (comments_synced_at is null
           or comments_synced_for is distinct from comments_count
           or (posted_at > now() - interval '7 days'
               and comments_synced_at < now() - make_interval(hours => ${COMMENT_RECHECK_HOURS})))
    order by comments_synced_at nulls first, posted_at desc
    limit 50`;

  let requests = 0;
  let postsSynced = 0;
  let stored = 0;
  let permissionSuspected = false;
  const partialPosts: string[] = [];

  for (const post of candidates) {
    if (requests >= COMMENT_REQUEST_BUDGET) break;
    const runStart = new Date();
    const rows: Record<string, unknown>[] = [];
    let next: string | undefined;
    let pages = 0;
    let complete = false;
    let emptyPages = 0;
    do {
      const body = next
        ? await api.get(next)
        : await api.get(`/${post.id}/comments`, {
          fields: "id,text,username,timestamp,like_count,from,replies{id,text,username,timestamp,like_count,from}",
          limit: 50,
        });
      requests++;
      pages++;
      const data = (body.data ?? []) as Json[];
      if (data.length === 0) emptyPages++;
      for (const c of data) {
        rows.push(commentRow(c, String(post.id), null));
        for (const r of (((c.replies as Json | undefined)?.data ?? []) as Json[])) {
          rows.push(commentRow(r, String(post.id), String(c.id)));
        }
      }
      next = (body.paging as Json | undefined)?.next as string | undefined;
      if (!next) complete = true;
      // Dua halaman kosong berturut-turut padahal API bilang ada komentar = izin belum aktif.
      if (rows.length === 0 && emptyPages >= 2 && Number(post.comments_count) > 0) {
        permissionSuspected = true;
        break;
      }
    } while (next && requests < COMMENT_REQUEST_BUDGET && pages < 40);

    // Hasil kosong untuk post yang menurut API punya komentar tidak pernah
    // dicatat sebagai "tersinkron, 0 komentar".
    if (rows.length === 0 && Number(post.comments_count) > 0 && (complete || emptyPages >= 2)) {
      permissionSuspected = true;
    }
    if (permissionSuspected) break;

    if (rows.length) {
      for (let i = 0; i < rows.length; i += 500) {
        await sql`
          insert into ig.comments ${sql(rows.slice(i, i + 500))}
          on conflict (id) do update set
            text = excluded.text, username = excluded.username, from_id = excluded.from_id,
            like_count = excluded.like_count, parent_id = excluded.parent_id,
            last_seen_at = excluded.last_seen_at, removed_at = null`;
      }
      stored += rows.length;
    }

    if (complete) {
      // Sync penuh: komentar yang tidak muncul lagi dianggap dihapus/disembunyikan.
      await sql`
        update ig.comments set removed_at = ${now}
        where media_id = ${post.id} and removed_at is null and last_seen_at < ${runStart}`;
      await sql`
        update ig.media set comments_synced_at = ${now}, comments_synced_for = comments_count
        where id = ${post.id}`;
      postsSynced++;
    } else {
      partialPosts.push(String(post.id)); // dilanjutkan run berikutnya
    }
  }

  return {
    candidates: candidates.length,
    postsSynced,
    stored,
    requests,
    partialPosts,
    permissionSuspected,
  };
}

function commentRow(c: Json, mediaId: string, parentId: string | null) {
  const from = (c.from as Json | undefined) ?? {};
  return {
    id: String(c.id),
    media_id: mediaId,
    parent_id: parentId,
    username: (c.username as string) ?? (from.username as string) ?? null,
    from_id: (from.id as string) ?? null,
    text: (c.text as string) ?? null,
    like_count: typeof c.like_count === "number" ? c.like_count : null,
    commented_at: new Date(String(c.timestamp)),
    last_seen_at: new Date(),
  };
}

/** Ambil satu "hari Meta" (tanggal Pacific). Window (end-12j, end+1j] terbukti mengembalikan tepat 1 hari. */
async function fetchAccountDay(api: Api, metricDate: string) {
  const end = zonedMidnight(addDays(metricDate, 1), TZ_META).getTime() / 1000;
  const window = { since: end - 43200, until: end + 3600 };
  const values: Record<string, number | null> = {};
  const errors: Record<string, string> = {};

  try {
    const body = await api.get("/me/insights", {
      metric: DAY_METRICS.join(","), period: "day", metric_type: "total_value", ...window,
    });
    for (const m of (body.data ?? []) as Json[]) {
      const v = (m.total_value as Json | undefined)?.value;
      values[m.name as string] = typeof v === "number" ? v : null;
    }
  } catch (e) {
    // Satu metrik bermasalah menggagalkan seluruh panggilan: ulangi satu per satu
    // supaya metrik lain tetap tersimpan.
    for (const metric of DAY_METRICS) {
      try {
        const body = await api.get("/me/insights", { metric, period: "day", metric_type: "total_value", ...window });
        const v = ((body.data as Json[])?.[0]?.total_value as Json | undefined)?.value;
        values[metric] = typeof v === "number" ? v : null;
      } catch (e2) {
        values[metric] = null;
        errors[metric] = errMsg(e2);
      }
    }
    errors._combined = errMsg(e);
  }

  try {
    const body = await api.get("/me/insights", {
      metric: "follows_and_unfollows", period: "day", metric_type: "total_value", breakdown: "follow_type", ...window,
    });
    const results = (((body.data as Json[])?.[0]?.total_value as Json)?.breakdowns as Json[])?.[0]?.results as
      | { dimension_values: string[]; value: number }[]
      | undefined;
    if (results?.length) {
      for (const r of results) {
        if (r.dimension_values[0] === "FOLLOWER") values.follows = r.value;
        if (r.dimension_values[0] === "NON_FOLLOWER") values.unfollows = r.value;
      }
    }
  } catch (e) {
    errors.follows_and_unfollows = errMsg(e);
  }

  return { values, errors };
}

async function upsertAccountDay(accountId: string, metricDate: string, values: Record<string, number | null>, errors: Record<string, string>) {
  const pick = (k: string) => (k in values ? values[k] : null);
  const row = {
    account_id: accountId,
    metric_date: metricDate,
    views: pick("views"), reach: pick("reach"), accounts_engaged: pick("accounts_engaged"),
    total_interactions: pick("total_interactions"), likes: pick("likes"), comments: pick("comments"),
    shares: pick("shares"), saves: pick("saves"), replies: pick("replies"),
    profile_views: pick("profile_views"), website_clicks: pick("website_clicks"),
    profile_links_taps: pick("profile_links_taps"), follows: pick("follows"), unfollows: pick("unfollows"),
    raw_json: { values, errors },
  };
  await sql`
    insert into ig.account_daily ${sql(row)}
    on conflict (account_id, metric_date) do update set
      views = excluded.views, reach = excluded.reach, accounts_engaged = excluded.accounts_engaged,
      total_interactions = excluded.total_interactions, likes = excluded.likes, comments = excluded.comments,
      shares = excluded.shares, saves = excluded.saves, replies = excluded.replies,
      profile_views = excluded.profile_views, website_clicks = excluded.website_clicks,
      profile_links_taps = excluded.profile_links_taps, follows = excluded.follows, unfollows = excluded.unfollows,
      raw_json = ig.account_daily.raw_json || excluded.raw_json, updated_at = now()`;
}

async function syncAccountDaily(api: Api, accountId: string, now: Date) {
  const todayMeta = dateIn(now, TZ_META);
  const lastComplete = addDays(todayMeta, -1);
  const refresh = Array.from({ length: ACCOUNT_REFRESH_DAYS }, (_, i) => addDays(lastComplete, -i));

  const earliest = addDays(lastComplete, -(ACCOUNT_BACKFILL_DAYS - 1));
  // Baris bisa sudah ada karena follower_count/followers_total (mode daily) tanpa
  // metrik harian. Hari dianggap "sudah" hanya bila metrik harian pernah diambil.
  const existing = await sql`
    select metric_date::text as d from ig.account_daily
    where account_id = ${accountId} and metric_date between ${earliest} and ${lastComplete}
      and raw_json ? 'values'`;
  const have = new Set(existing.map((r) => r.d as string));
  const gaps: string[] = [];
  for (let i = ACCOUNT_REFRESH_DAYS; i < ACCOUNT_BACKFILL_DAYS && gaps.length < ACCOUNT_GAP_PER_RUN; i++) {
    const d = addDays(lastComplete, -i);
    if (!have.has(d)) gaps.push(d);
  }

  const failed: Record<string, string> = {};
  for (const d of [...refresh, ...gaps]) {
    const { values, errors } = await fetchAccountDay(api, d);
    const allMissing = DAY_METRICS.every((m) => values[m] == null);
    if (allMissing && Object.keys(errors).length) {
      failed[d] = errors._combined ?? Object.values(errors)[0];
      // Tetap tulis baris supaya celah yang memang tidak tersedia tidak dicoba ulang tiap jam.
    }
    await upsertAccountDay(accountId, d, values, errors);
  }
  return { refreshed: refresh.length, backfilled: gaps.length, failedDays: failed };
}

async function syncFollowerSnapshot(accountId: string, followersCount: number | undefined, now: Date) {
  if (typeof followersCount !== "number") return;
  // Snapshot jumlah follower ditempel ke hari Meta yang sedang berjalan.
  const metricDate = dateIn(now, TZ_META);
  await sql`
    insert into ig.account_daily (account_id, metric_date, followers_total)
    values (${accountId}, ${metricDate}, ${followersCount})
    on conflict (account_id, metric_date) do update set followers_total = excluded.followers_total, updated_at = now()`;
}

async function syncNewFollowers(api: Api, accountId: string, now: Date) {
  const until = Math.floor(now.getTime() / 1000);
  const since = until - 29 * 86400; // API membatasi follower_count ke 30 hari
  const body = await api.get("/me/insights", { metric: "follower_count", period: "day", since, until });
  const values = (((body.data as Json[])?.[0]?.values ?? []) as { value: number; end_time: string }[]);
  let n = 0;
  for (const v of values) {
    // end_time = tengah malam Pacific di AKHIR hari; tanggal harinya = end_time - 1 detik.
    const metricDate = dateIn(new Date(new Date(v.end_time).getTime() - 1000), TZ_META);
    await sql`
      insert into ig.account_daily (account_id, metric_date, new_followers)
      values (${accountId}, ${metricDate}, ${v.value})
      on conflict (account_id, metric_date) do update set new_followers = excluded.new_followers, updated_at = now()`;
    n++;
  }
  return n;
}

async function syncDemographics(api: Api, accountId: string, now: Date) {
  const capturedDate = wibDate(now);
  const plan: { metric: string; breakdown: string; type: string; params?: Record<string, string> }[] = [
    { metric: "follower_demographics", breakdown: "city", type: "city" },
    { metric: "follower_demographics", breakdown: "country", type: "country" },
    { metric: "follower_demographics", breakdown: "age,gender", type: "age_gender" },
    { metric: "engaged_audience_demographics", breakdown: "age,gender", type: "age_gender", params: { timeframe: "last_30_days" } },
    { metric: "engaged_audience_demographics", breakdown: "city", type: "city", params: { timeframe: "last_30_days" } },
  ];
  const summary: Record<string, number | string> = {};
  for (const p of plan) {
    const key = `${p.metric}:${p.type}`;
    try {
      const body = await api.get("/me/insights", {
        metric: p.metric, period: "lifetime", metric_type: "total_value", breakdown: p.breakdown, ...(p.params ?? {}),
      });
      const results = (((body.data as Json[])?.[0]?.total_value as Json)?.breakdowns as Json[])?.[0]?.results as
        | { dimension_values: string[]; value: number }[]
        | undefined;
      if (!results?.length) {
        summary[key] = 0; // kosong dari Meta (mis. audiens terlalu kecil) — tidak ditulis
        continue;
      }
      const rows = results.map((r) => ({
        account_id: accountId, captured_date: capturedDate, metric: p.metric, breakdown_type: p.type,
        breakdown_value: r.dimension_values.join("|"), value: r.value,
      }));
      await sql`
        insert into ig.audience_demographics ${sql(rows)}
        on conflict (account_id, captured_date, metric, breakdown_type, breakdown_value)
        do update set value = excluded.value, captured_at = now()`;
      summary[key] = rows.length;
    } catch (e) {
      summary[key] = `error: ${errMsg(e)}`;
    }
  }
  return summary;
}

async function syncOnlineFollowers(api: Api, accountId: string, now: Date) {
  // Tanpa since/until API hanya mengirim 2 hari terakhir, dan keduanya sering
  // masih kosong (jeda ±2 hari). Minta 29 hari lalu simpan semua hari yang terisi.
  const until = Math.floor(now.getTime() / 1000);
  const body = await api.get("/me/insights", {
    metric: "online_followers", period: "lifetime", since: until - 29 * 86400, until,
  });
  const days = (((body.data as Json[])?.[0]?.values ?? []) as { value: Record<string, number>; end_time: string }[])
    .filter((v) => v.value && Object.keys(v.value).length > 0);
  const rows = days.flatMap((day) => {
    const end = new Date(day.end_time);
    const dayStart = new Date(end.getTime() - 86400_000);
    const metricDate = dateIn(new Date(end.getTime() - 1000), TZ_META);
    return Object.entries(day.value).map(([hourPt, value]) => {
      // Jam dari API = jam Pacific pada hari tersebut. Konversi via instant nyata supaya DST ikut benar.
      const instant = new Date(dayStart.getTime() + Number(hourPt) * 3600_000);
      const hourWib = new Date(instant.getTime() + WIB_OFFSET_MS).getUTCHours();
      return { account_id: accountId, captured_date: metricDate, hour_wib: hourWib, value };
    });
  });
  if (!rows.length) return { days: 0, rows: 0 };
  await sql`
    insert into ig.online_followers ${sql(rows)}
    on conflict (account_id, captured_date, hour_wib) do update set value = excluded.value, captured_at = now()`;
  return { days: days.length, rows: rows.length };
}

async function maybeRefreshToken(api: Api, secretId: string, updatedAt: Date, now: Date) {
  const ageDays = (now.getTime() - updatedAt.getTime()) / 86400_000;
  if (ageDays < TOKEN_REFRESH_AFTER_DAYS) return { refreshed: false, ageDays: Math.round(ageDays * 10) / 10 };
  const body = await api.get("https://graph.instagram.com/refresh_access_token", { grant_type: "ig_refresh_token" });
  const token = body.access_token as string | undefined;
  const expiresIn = body.expires_in as number | undefined;
  if (!token) throw new Error("Respons refresh token tidak berisi access_token");
  const expiresAt = expiresIn ? new Date(now.getTime() + expiresIn * 1000).toISOString() : "unknown";
  await sql`select vault.update_secret(${secretId}::uuid, ${token}, 'ig_access_token', ${`expires_at=${expiresAt}`})`;
  return { refreshed: true, expiresAt };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "hourly";
  if (!["hourly", "daily"].includes(mode)) return json(400, { error: "mode harus hourly atau daily" });

  const secrets = await sql`
    select name, id::text as id, decrypted_secret, updated_at
    from vault.decrypted_secrets where name in ('ig_sync_secret', 'ig_access_token')`;
  const byName = new Map(secrets.map((s) => [s.name as string, s]));
  const expected = byName.get("ig_sync_secret")?.decrypted_secret as string | undefined;
  const provided = req.headers.get("x-sync-secret") ?? "";
  if (!expected || !timingSafeEqual(provided, expected)) return json(401, { error: "unauthorized" });

  const tokenRow = byName.get("ig_access_token");
  if (!tokenRow) return json(500, { error: "Vault ig_access_token belum diisi" });

  const jobName = `ig-sync:${mode}`;
  // Cegah dua run tumpang tindih (cron + pemanggilan manual).
  const running = await sql`
    select id from ig.sync_logs
    where job_name = ${jobName} and status = 'running' and started_at > now() - interval '10 minutes' limit 1`;
  if (running.length) return json(409, { error: "sync masih berjalan", log_id: running[0].id });

  const [{ id: logId }] = await sql`insert into ig.sync_logs (job_name) values (${jobName}) returning id`;
  const api = new Api(tokenRow.decrypted_secret as string);
  const now = new Date();
  const details: Record<string, unknown> = {};
  const failures: string[] = [];

  const step = async (name: string, fn: () => Promise<unknown>) => {
    try {
      details[name] = await fn();
    } catch (e) {
      details[name] = { error: errMsg(e) };
      failures.push(name);
    }
  };

  let accountId: string | null = null;
  let followersCount: number | undefined;
  await step("profile", async () => {
    const p = await syncProfile(api);
    accountId = p.accountId;
    followersCount = p.followersCount;
    return p;
  });

  if (accountId) {
    const id: string = accountId;
    if (mode === "hourly") {
      await step("media", () => syncMedia(api, id, now));
      await step("comments", () => syncComments(api, now));
      await step("account_daily", () => syncAccountDaily(api, id, now));
      await step("followers_total", () => syncFollowerSnapshot(id, followersCount, now));
    } else {
      await step("new_followers", () => syncNewFollowers(api, id, now));
      await step("demographics", () => syncDemographics(api, id, now));
      await step("online_followers", () => syncOnlineFollowers(api, id, now));
      await step("token", () => maybeRefreshToken(api, tokenRow.id as string, new Date(tokenRow.updated_at as string), now));
    }
  }

  const status = !accountId ? "error" : failures.length ? "partial" : "success";
  details.usage = api.lastUsage;
  await sql`
    update ig.sync_logs set finished_at = now(), status = ${status}, requests_used = ${api.requests},
      details = ${sql.json(details as never)},
      error_message = ${failures.length ? `Gagal: ${failures.join(", ")}` : null}
    where id = ${logId}`;

  return json(status === "error" ? 502 : 200, { status, mode, requests: api.requests, failures, details });
});

// Dibuat oleh Faiz Hazim Hawari · skill-analysis
