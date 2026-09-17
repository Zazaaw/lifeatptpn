import "server-only";

import { rpc } from "./supabase-server";
import type { ContentKind } from "./kinds";

/*
 * Tipe hasil function public.ig_* (supabase/migrations/*_ig_dashboard_functions.sql).
 * Angka dari Postgres bigint/numeric datang sebagai number di JSON.
 * NULL = tidak tersedia; jangan diganti 0 di tampilan.
 */

export type Nullable<T> = T | null;

export type DashboardMeta = {
  account: {
    id: string;
    username: string;
    name: string | null;
    followers_count: number | null;
    media_count: number | null;
    profile_picture_url: string | null;
  } | null;
  last_hourly: { finished_at: string; status: string } | null;
  last_hourly_success: string | null;
  last_daily_success: string | null;
  first_sync_at: string | null;
  account_days: { min: string | null; max: string | null; count: number };
  media: { count: number; stories: number; first_posted_at: string | null; last_posted_at: string | null };
  comments: {
    stored: number;
    api_total: number;
    posts_synced: number;
    last_run: {
      candidates: number;
      postsSynced: number;
      stored: number;
      requests: number;
      permissionSuspected: boolean;
    } | { error: string } | null;
  };
  token_note: string | null;
  token_updated_at: string | null;
};

export type AccountTotals = {
  days_with_data?: number;
  views?: Nullable<number>;
  total_interactions?: Nullable<number>;
  likes?: Nullable<number>;
  comments?: Nullable<number>;
  shares?: Nullable<number>;
  saves?: Nullable<number>;
  profile_views?: Nullable<number>;
  website_clicks?: Nullable<number>;
  reach_avg_daily?: Nullable<number>;
  accounts_engaged_sum?: Nullable<number>;
  new_followers?: Nullable<number>;
  new_followers_days?: number;
};

export type PostTotals = {
  posts?: number;
  views?: Nullable<number>;
  median_views?: Nullable<number>;
  median_er?: Nullable<number>;
};

export type SeriesPoint = {
  date: string;
  views: Nullable<number>;
  reach: Nullable<number>;
  total_interactions: Nullable<number>;
  new_followers: Nullable<number>;
  followers_total: Nullable<number>;
};

export type KindSummary = {
  kind: ContentKind;
  posts: number;
  views: Nullable<number>;
  median_views: Nullable<number>;
  median_er: Nullable<number>;
};

export type TopPost = {
  id: string;
  content_kind: ContentKind;
  caption: Nullable<string>;
  permalink: Nullable<string>;
  thumb_url: Nullable<string>;
  posted_at: string;
  views: Nullable<number>;
  reach: Nullable<number>;
  total_interactions: Nullable<number>;
  engagement_rate: Nullable<number>;
  views_24h: Nullable<number>;
};

export type Overview = {
  range: { from: string; to: string; days: number; prev_from: string; prev_to: string };
  current: AccountTotals;
  previous: AccountTotals;
  posts_current: PostTotals;
  posts_previous: PostTotals;
  followers: {
    latest: { date: string; value: number } | null;
    at_start: { date: string; value: number } | null;
    at_end: { date: string; value: number } | null;
  };
  series: SeriesPoint[];
  kinds: KindSummary[];
  top_posts: TopPost[];
};

export type ContentRow = TopPost & {
  rank: number;
  post_age_hours: Nullable<number>;
  metrics_at: Nullable<string>;
  likes: Nullable<number>;
  comments: Nullable<number>;
  saves: Nullable<number>;
  shares: Nullable<number>;
  replies: Nullable<number>;
  views_7d: Nullable<number>;
  reels_avg_watch_time_ms: Nullable<number>;
  reels_skip_rate: Nullable<number>;
  /** Jumlah komentar menurut API (termasuk balasan). */
  comments_count: Nullable<number>;
  /** Komentar yang benar-benar tersimpan dari sinkron. */
  stored_comments: number;
};

export type ContentPage = {
  total: number;
  with_sort_value: number;
  limit: number;
  offset: number;
  rows: ContentRow[];
};

export const SORTS = ["views", "views_24h", "views_7d", "engagement_rate", "reach", "shares", "saves", "comments", "posted_at"] as const;
export type SortKey = (typeof SORTS)[number];

export type MediaDetail = {
  media: ContentRow & {
    posted_dow: number;
    posted_hour: number;
    follows: Nullable<number>;
    profile_visits: Nullable<number>;
    save_rate: Nullable<number>;
    share_rate: Nullable<number>;
    last_synced_at: Nullable<string>;
  };
  snapshots: {
    captured_at: string;
    post_age_hours: number;
    views: Nullable<number>;
    reach: Nullable<number>;
    likes: Nullable<number>;
    comments: Nullable<number>;
    saves: Nullable<number>;
    shares: Nullable<number>;
    total_interactions: Nullable<number>;
  }[];
} | null;

export const BEST_TIME_METRICS = ["views_mature", "views_24h", "engagement_rate"] as const;
export type BestTimeMetric = (typeof BEST_TIME_METRICS)[number];

export type Slot = { n: number; median: number; valid: boolean };
export type BestTime = {
  metric: BestTimeMetric;
  min_samples: number;
  posts_in_range: number;
  posts_with_value: number;
  overall_median: Nullable<number>;
  cells: (Slot & { dow: number; hour: number })[];
  by_dow: (Slot & { dow: number })[];
  by_hour: (Slot & { hour: number })[];
  online_followers: OnlineHour[];
};

export type OnlineHour = { hour: number; avg: number; days: number };

export type Audience = {
  demographics: {
    metric: "follower_demographics" | "engaged_audience_demographics";
    type: "city" | "country" | "age_gender";
    value: string;
    count: number;
    captured_date: string;
  }[];
  online_followers: OnlineHour[];
  online_range: { from: string; to: string } | null;
  followers_total: Nullable<number>;
};

export const getMeta = () => rpc<DashboardMeta>("ig_dashboard_meta", {}, "status data");

export const getOverview = (from: string, to: string) =>
  rpc<Overview>("ig_overview", { p_from: from, p_to: to }, "ringkasan akun");

export const getContent = (args: {
  from: string;
  to: string;
  kind?: ContentKind | null;
  sort?: SortKey;
  limit?: number;
  offset?: number;
}) =>
  rpc<ContentPage>(
    "ig_content",
    {
      p_from: args.from,
      p_to: args.to,
      p_kind: args.kind ?? null,
      p_sort: args.sort ?? "views",
      p_limit: args.limit ?? 30,
      p_offset: args.offset ?? 0,
    },
    "daftar konten"
  );

export const getMediaDetail = (id: string) => rpc<MediaDetail>("ig_media_detail", { p_id: id }, "detail konten");

export const getBestTime = (args: { from: string; to: string; metric: BestTimeMetric; kind?: ContentKind | null }) =>
  rpc<BestTime>(
    "ig_best_time",
    { p_from: args.from, p_to: args.to, p_metric: args.metric, p_kind: args.kind ?? null, p_min_samples: 3 },
    "analisis waktu posting"
  );

export const getAudience = () => rpc<Audience>("ig_audience", {}, "data audiens");

export type CalendarPost = {
  id: string;
  content_kind: ContentKind;
  caption: Nullable<string>;
  posted_at: string;
  date: string;
  hour: number;
  minute: number;
  views: Nullable<number>;
};
export type PostCalendar = { from: string; to: string; posts: CalendarPost[] };

export const getPostCalendar = (to: string) =>
  rpc<PostCalendar>("ig_post_calendar", { p_to: to }, "kalender posting");

export type CommentItem = {
  id: string;
  username: Nullable<string>;
  text: Nullable<string>;
  like_count: Nullable<number>;
  commented_at: string;
};
export type MediaComments = {
  media: { id: string; comments_count: Nullable<number>; comments_synced_at: Nullable<string>; comments_synced_for: Nullable<number> } | null;
  stored: number;
  unique_accounts: number;
  matched: number;
  limit: number;
  offset: number;
  top_accounts: { username: string; n: number }[];
  rows: (CommentItem & { replies: CommentItem[] })[];
};

export const getMediaComments = (args: { id: string; search?: string | null; limit?: number; offset?: number }) =>
  rpc<MediaComments>(
    "ig_media_comments",
    { p_id: args.id, p_search: args.search ?? null, p_limit: args.limit ?? 50, p_offset: args.offset ?? 0 },
    "komentar"
  );

export type QuizPost = {
  id: string;
  content_kind: ContentKind;
  caption: Nullable<string>;
  permalink: Nullable<string>;
  thumb_url: Nullable<string>;
  posted_at: string;
  comments_count: Nullable<number>;
  comments_synced_at: Nullable<string>;
  stored_comments: number;
};

export const getQuizPosts = () => rpc<QuizPost[]>("ig_quiz_posts", { p_limit: 60 }, "daftar post kuis");

export type QuizEntries = {
  comments_considered: number;
  comments_matched: number;
  entries: { username: string; n: number; first_at: string; sample: Nullable<string> }[];
};

export const getQuizEntries = (args: {
  mediaId: string;
  keyword?: string | null;
  until?: string | null;
  exclude?: string[];
  includeReplies?: boolean;
}) =>
  rpc<QuizEntries>(
    "ig_quiz_entries",
    {
      p_media_id: args.mediaId,
      p_keyword: args.keyword ?? null,
      p_until: args.until ?? null,
      p_exclude: args.exclude ?? [],
      p_include_replies: args.includeReplies ?? false,
    },
    "peserta kuis"
  );

/** Status izin komentar dari run sinkron terakhir. */
export function commentsPermissionMissing(meta: DashboardMeta | null) {
  const run = meta?.comments?.last_run;
  return Boolean(run && "permissionSuspected" in run && run.permissionSuspected);
}

// Dibuat oleh Faiz Hazim Hawari · skill-analysis
