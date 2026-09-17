-- ============================================================================
-- lifeatptpn-insight: schema ig
-- ----------------------------------------------------------------------------
-- Project Supabase ini dipakai bersama aplikasi maganghub-seleksi. Karena itu:
--   * semua tabel project ini ada di schema `ig`, tidak menyentuh `public`;
--   * schema `ig` TIDAK diberi akses ke anon/authenticated (tidak lewat API
--     publik). Dashboard membaca lewat function public.ig_* yang hanya boleh
--     dieksekusi service_role (lihat migrasi ig_dashboard_functions).
--   * edge function ig-sync menulis langsung lewat koneksi Postgres.
-- ============================================================================

create schema if not exists ig;
revoke all on schema ig from public, anon, authenticated;
grant usage on schema ig to service_role;

-- ---------------------------------------------------------------------------
-- Akun yang terhubung
-- ---------------------------------------------------------------------------
create table ig.accounts (
  id               text primary key,          -- IG user id (field user_id, 1784...)
  app_scoped_id    text,                      -- field id dari /me (Instagram Login)
  username         text not null,
  name             text,
  account_type     text,
  followers_count  integer,
  follows_count    integer,
  media_count      integer,
  profile_picture_url text,
  connected_at     timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Satu baris per postingan (termasuk story yang sempat tertangkap sync)
-- ---------------------------------------------------------------------------
create table ig.media (
  id                  text primary key,
  account_id          text not null references ig.accounts(id) on delete cascade,
  media_type          text not null,           -- IMAGE / VIDEO / CAROUSEL_ALBUM
  media_product_type  text,                    -- FEED / REELS / STORY
  -- Jenis konten versi bahasa user. Dihitung di DB supaya semua halaman,
  -- laporan, dan Excel memakai pengelompokan yang sama persis.
  content_kind text generated always as (
    case
      when media_product_type = 'STORY' then 'story'
      when media_product_type = 'REELS' then 'reels'
      when media_type = 'CAROUSEL_ALBUM' then 'carousel'
      when media_type = 'VIDEO' then 'video'
      else 'foto'
    end
  ) stored,
  caption          text,
  permalink        text,
  media_url        text,                       -- URL CDN Meta, kedaluwarsa; diperbarui tiap sync
  thumbnail_url    text,
  posted_at        timestamptz not null,
  first_seen_at    timestamptz not null default now(),
  last_synced_at   timestamptz,
  updated_at       timestamptz not null default now()
);
create index media_account_posted_idx on ig.media (account_id, posted_at desc);
create index media_kind_posted_idx on ig.media (content_kind, posted_at desc);

-- ---------------------------------------------------------------------------
-- Snapshot metrik per postingan. APPEND ONLY, tidak pernah di-overwrite.
-- Metrik yang tidak didukung jenis konten tertentu disimpan NULL (bukan 0),
-- supaya "tidak tersedia" tidak terbaca sebagai "nol".
-- ---------------------------------------------------------------------------
create table ig.media_snapshots (
  id                        bigint generated always as identity primary key,
  media_id                  text not null references ig.media(id) on delete cascade,
  captured_at               timestamptz not null default now(),
  post_age_hours            numeric(10,2) not null,
  views                     bigint,
  reach                     bigint,
  likes                     bigint,
  comments                  bigint,
  saves                     bigint,
  shares                    bigint,
  total_interactions        bigint,
  follows                   bigint,          -- feed saja
  profile_visits            bigint,          -- feed & story
  profile_activity          bigint,          -- feed saja
  replies                   bigint,          -- story saja
  navigation                bigint,          -- story saja
  reels_avg_watch_time_ms   bigint,          -- reels saja
  reels_total_watch_time_ms bigint,          -- reels saja
  reels_skip_rate           numeric(6,2),    -- reels saja, persen
  raw_json                  jsonb not null   -- {metric: value} ringkas dari respons API
);
create index media_snapshots_media_captured_idx on ig.media_snapshots (media_id, captured_at desc);
create index media_snapshots_media_age_idx on ig.media_snapshots (media_id, post_age_hours);

-- ---------------------------------------------------------------------------
-- Metrik harian level akun.
-- PENTING: Meta menghitung "hari" untuk insight akun dengan batas tengah malam
-- Pacific Time (end_time 07:00/08:00 UTC = 14:00/15:00 WIB). Window yang
-- dipotong per hari WIB dibulatkan API ke hari Pacific. Jadi metric_date di
-- sini adalah tanggal hari Meta (America/Los_Angeles), bukan tanggal WIB.
-- ---------------------------------------------------------------------------
create table ig.account_daily (
  account_id          text not null references ig.accounts(id) on delete cascade,
  metric_date         date not null,
  views               bigint,
  reach               bigint,           -- akun unik per hari; TIDAK boleh dijumlah lintas hari sebagai "reach periode"
  accounts_engaged    bigint,
  total_interactions  bigint,
  likes               bigint,
  comments            bigint,
  shares              bigint,
  saves               bigint,
  replies             bigint,
  profile_views       bigint,
  website_clicks      bigint,
  profile_links_taps  bigint,
  follows             bigint,           -- dari follows_and_unfollows (FOLLOWER)
  unfollows           bigint,           -- dari follows_and_unfollows (NON_FOLLOWER)
  new_followers       bigint,           -- metrik follower_count: follower BARU per hari (hanya 30 hari terakhir)
  followers_total     integer,          -- followers_count dari /me, hanya terisi pada hari sync berjalan
  raw_json            jsonb not null default '{}'::jsonb,  -- nilai + galat per metrik
  captured_at         timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  primary key (account_id, metric_date)
);

-- ---------------------------------------------------------------------------
-- Demografi audiens (snapshot)
-- ---------------------------------------------------------------------------
create table ig.audience_demographics (
  account_id       text not null references ig.accounts(id) on delete cascade,
  captured_date    date not null,        -- tanggal WIB saat diambil
  metric           text not null,        -- follower_demographics / engaged_audience_demographics
  breakdown_type   text not null,        -- city / country / age / gender
  breakdown_value  text not null,
  value            bigint not null,
  captured_at      timestamptz not null default now(),
  primary key (account_id, captured_date, metric, breakdown_type, breakdown_value)
);

-- ---------------------------------------------------------------------------
-- Sebaran jam follower online. API mengirim jam dalam Pacific Time; kolom
-- hour_wib sudah dikonversi saat sync.
-- ---------------------------------------------------------------------------
create table ig.online_followers (
  account_id     text not null references ig.accounts(id) on delete cascade,
  captured_date  date not null,          -- tanggal hari Meta dari end_time
  hour_wib       smallint not null check (hour_wib between 0 and 23),
  value          bigint not null,
  captured_at    timestamptz not null default now(),
  primary key (account_id, captured_date, hour_wib)
);

-- ---------------------------------------------------------------------------
-- Log sync untuk debugging
-- ---------------------------------------------------------------------------
create table ig.sync_logs (
  id              bigint generated always as identity primary key,
  job_name        text not null,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  status          text not null default 'running' check (status in ('running','success','partial','error')),
  requests_used   integer not null default 0,
  details         jsonb not null default '{}'::jsonb,
  error_message   text
);
create index sync_logs_job_started_idx on ig.sync_logs (job_name, started_at desc);

-- RLS aktif tanpa policy: kalau suatu saat schema ig terekspos ke API,
-- anon/authenticated tetap tidak bisa membaca apa pun (fail-closed).
alter table ig.accounts              enable row level security;
alter table ig.media                 enable row level security;
alter table ig.media_snapshots       enable row level security;
alter table ig.account_daily         enable row level security;
alter table ig.audience_demographics enable row level security;
alter table ig.online_followers      enable row level security;
alter table ig.sync_logs             enable row level security;

grant select, insert, update, delete on all tables in schema ig to service_role;
grant usage, select on all sequences in schema ig to service_role;

-- Dibuat oleh Faiz Hazim Hawari · skill-analysis
