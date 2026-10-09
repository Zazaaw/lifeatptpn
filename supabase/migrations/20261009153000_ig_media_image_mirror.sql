-- ============================================================================
-- Cermin foto post ke Supabase Storage.
--
-- Masalah yang diselesaikan (kejadian 19 Sep - 9 Okt 2026):
-- ig.media hanya menyimpan URL CDN Meta, dan URL itu bertanda tangan dengan
-- masa berlaku beberapa hari. Selama sync sehat URL diperbarui tiap jam, jadi
-- foto selalu tampil. Begitu Instagram API memblokir akses (OAuthException
-- code 200 "API access blocked."), sync berhenti, URL tidak pernah segar lagi,
-- dan CDN membalas 403 "URL signature expired" - semua thumbnail di dashboard
-- hilang walau barisnya lengkap di database.
--
-- Perbaikan: file gambarnya disimpan sendiri di bucket publik `ig-thumbs`,
-- lalu URL permanen itu yang dipakai dashboard. Foto tetap tampil meski API
-- Instagram mati atau token dicabut. URL CDN tetap disimpan sebagai cadangan
-- untuk post yang belum selesai dicermin.
-- ============================================================================

alter table ig.media
  add column if not exists image_url          text,         -- URL permanen di Storage (tidak kedaluwarsa)
  add column if not exists image_synced_at    timestamptz,  -- kapan file berhasil disimpan
  add column if not exists image_attempted_at timestamptz,  -- percobaan terakhir (sukses atau gagal)
  add column if not exists image_error        text;         -- sebab gagal terakhir, supaya kegagalan terlihat

comment on column ig.media.image_url is 'URL publik hasil cermin di bucket ig-thumbs. Dipakai dashboard lebih dulu daripada URL CDN Meta yang kedaluwarsa.';
comment on column ig.media.image_error is 'Sebab kegagalan cermin terakhir (mis. CDN 403 karena URL sudah mati). NULL bila berhasil.';

-- Kandidat cermin: post yang belum punya file tersimpan. Partial index supaya
-- query pemilihan kandidat tetap murah walau tabel media tumbuh.
create index if not exists media_image_pending_idx on ig.media (posted_at desc)
  where image_url is null;

-- ---------------------------------------------------------------------------
-- Bucket publik khusus thumbnail post.
-- Publik karena dashboard ini memang tanpa login dan isinya foto post
-- Instagram yang sudah publik; dengan begitu tidak perlu menandatangani URL
-- per permintaan. Bucket maganghub (magang-berkas) tidak disentuh.
-- Tidak ada policy baru: baca publik lewat endpoint /object/public, tulis
-- hanya oleh service_role milik edge function yang melewati RLS.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ig-thumbs', 'ig-thumbs', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- View statistik post: dahulukan file tersimpan, URL CDN jadi cadangan.
-- Definisi disalin utuh dari 20260917121000_ig_dashboard_v2.sql; yang berubah
-- hanya baris thumb_url (aturan create or replace view: nama, tipe, dan urutan
-- kolom tidak boleh berubah).
-- ---------------------------------------------------------------------------
create or replace view ig.v_media_stats
with (security_invoker = true)
as
select
  m.id,
  m.account_id,
  m.content_kind,
  m.media_type,
  m.media_product_type,
  m.caption,
  m.permalink,
  coalesce(m.image_url, m.thumbnail_url, m.media_url) as thumb_url,
  m.posted_at,
  (m.posted_at at time zone 'Asia/Jakarta') as posted_at_wib,
  extract(isodow from m.posted_at at time zone 'Asia/Jakarta')::int as posted_dow,
  extract(hour from m.posted_at at time zone 'Asia/Jakarta')::int as posted_hour,
  m.last_synced_at,
  s.captured_at as metrics_at,
  s.post_age_hours,
  s.views, s.reach, s.likes, s.comments, s.saves, s.shares, s.total_interactions,
  s.follows, s.profile_visits, s.replies,
  s.reels_avg_watch_time_ms, s.reels_skip_rate,
  case when s.reach > 0 then
    round((coalesce(s.likes,0) + coalesce(s.comments,0) + coalesce(s.saves,0) + coalesce(s.shares,0))::numeric / s.reach, 6)
  end as engagement_rate,
  case when s.reach > 0 and s.saves is not null then round(s.saves::numeric / s.reach, 6) end as save_rate,
  case when s.reach > 0 and s.shares is not null then round(s.shares::numeric / s.reach, 6) end as share_rate,
  ig.views_at_age(m.id, 24) as views_24h,
  ig.views_at_age(m.id, 168) as views_7d,
  m.comments_count,
  m.comments_synced_at,
  (select count(*) from ig.comments c where c.media_id = m.id and c.removed_at is null) as stored_comments
from ig.media m
left join lateral (
  select * from ig.media_snapshots ms
  where ms.media_id = m.id
  order by ms.captured_at desc
  limit 1
) s on true;

-- ---------------------------------------------------------------------------
-- Daftar post untuk Spin Wheel: satu-satunya tempat lain yang menyusun
-- thumb_url langsung dari ig.media (tidak lewat view di atas).
-- ---------------------------------------------------------------------------
create or replace function public.ig_quiz_posts(p_limit int default 60)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(to_jsonb(p) order by p.posted_at desc), '[]'::jsonb)
  from (
    select m.id, m.content_kind, left(m.caption, 140) as caption, m.permalink,
           coalesce(m.image_url, m.thumbnail_url, m.media_url) as thumb_url, m.posted_at,
           m.comments_count, m.comments_synced_at,
           (select count(*) from ig.comments c where c.media_id = m.id and c.removed_at is null) as stored_comments
    from ig.media m
    where m.content_kind <> 'story'
    order by m.posted_at desc
    limit least(greatest(coalesce(p_limit, 60), 1), 200)
  ) p
$$;

revoke all on function public.ig_quiz_posts(int) from public, anon, authenticated;
grant execute on function public.ig_quiz_posts(int) to service_role;

-- Dibuat oleh Faiz Hazim Hawari · skill-analysis
