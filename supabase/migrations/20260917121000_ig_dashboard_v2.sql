-- ============================================================================
-- Dashboard v2 (redesign): jumlah komentar & like di statistik post, status
-- sinkron komentar di meta, data kalender posting & komposisi konten.
-- ============================================================================

-- Kolom baru hanya boleh ditambahkan di AKHIR view (aturan create or replace view).
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
  coalesce(m.thumbnail_url, m.media_url) as thumb_url,
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
-- Meta + status komentar
-- ---------------------------------------------------------------------------
create or replace function public.ig_dashboard_meta()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'account', (select to_jsonb(a) - 'app_scoped_id' from ig.accounts a order by connected_at limit 1),
    'last_hourly', (select jsonb_build_object('finished_at', finished_at, 'status', status)
                    from ig.sync_logs where job_name = 'ig-sync:hourly' and finished_at is not null
                    order by started_at desc limit 1),
    'last_hourly_success', (select max(finished_at) from ig.sync_logs where job_name = 'ig-sync:hourly' and status in ('success','partial')),
    'last_daily_success', (select max(finished_at) from ig.sync_logs where job_name = 'ig-sync:daily' and status in ('success','partial')),
    'first_sync_at', (select min(started_at) from ig.sync_logs),
    'account_days', (select jsonb_build_object('min', min(metric_date), 'max', max(metric_date), 'count', count(*))
                     from ig.account_daily where views is not null),
    'media', (select jsonb_build_object('count', count(*) filter (where content_kind <> 'story'),
                                        'stories', count(*) filter (where content_kind = 'story'),
                                        'first_posted_at', min(posted_at), 'last_posted_at', max(posted_at))
              from ig.media),
    'comments', jsonb_build_object(
      'stored', (select count(*) from ig.comments where removed_at is null),
      'api_total', (select coalesce(sum(comments_count), 0) from ig.media where content_kind <> 'story'),
      'posts_synced', (select count(*) from ig.media where comments_synced_at is not null),
      -- Status sinkron komentar dari run jam-an terakhir yang menjalankan langkah komentar.
      'last_run', (select details->'comments' from ig.sync_logs
                   where job_name = 'ig-sync:hourly' and details ? 'comments'
                   order by started_at desc limit 1)
    ),
    'token_note', (select description from vault.secrets where name = 'ig_access_token'),
    'token_updated_at', (select updated_at from vault.secrets where name = 'ig_access_token')
  )
$$;

-- ---------------------------------------------------------------------------
-- Daftar konten: + comments_count & komentar tersimpan
-- ---------------------------------------------------------------------------
create or replace function public.ig_content(
  p_from date,
  p_to date,
  p_kind text default null,
  p_sort text default 'views',
  p_limit int default 30,
  p_offset int default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sort text := coalesce(p_sort, 'views');
  v_limit int := least(greatest(coalesce(p_limit, 30), 1), 500);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
begin
  if v_sort not in ('views','views_24h','views_7d','engagement_rate','reach','shares','saves','posted_at','comments') then
    raise exception 'Urutan tidak dikenal: %', v_sort;
  end if;
  if p_kind is not null and p_kind not in ('reels','carousel','foto','video','story') then
    raise exception 'Jenis konten tidak dikenal: %', p_kind;
  end if;

  return (
    with base as (
      select * from ig.v_media_stats
      where (posted_at at time zone 'Asia/Jakarta')::date between p_from and p_to
        and (p_kind is null or content_kind = p_kind)
        and (p_kind = 'story' or content_kind <> 'story')
    ), ordered as (
      select b.*,
        row_number() over (order by
          case v_sort
            when 'views' then b.views::numeric
            when 'views_24h' then b.views_24h
            when 'views_7d' then b.views_7d
            when 'engagement_rate' then b.engagement_rate
            when 'reach' then b.reach::numeric
            when 'shares' then b.shares::numeric
            when 'saves' then b.saves::numeric
            when 'comments' then coalesce(b.comments_count, b.comments)::numeric
            when 'posted_at' then extract(epoch from b.posted_at)::numeric
          end desc nulls last,
          b.posted_at desc
        ) as rn
      from base b
    )
    select jsonb_build_object(
      'total', (select count(*) from base),
      'with_sort_value', (select count(*) from ordered where case v_sort
            when 'views' then views::numeric when 'views_24h' then views_24h when 'views_7d' then views_7d
            when 'engagement_rate' then engagement_rate when 'reach' then reach::numeric
            when 'shares' then shares::numeric when 'saves' then saves::numeric
            when 'comments' then coalesce(comments_count, comments)::numeric else 1 end is not null),
      'limit', v_limit,
      'offset', v_offset,
      'rows', coalesce((
        select jsonb_agg(jsonb_build_object(
          'rank', rn, 'id', id, 'content_kind', content_kind, 'caption', left(caption, 300),
          'permalink', permalink, 'thumb_url', thumb_url, 'posted_at', posted_at,
          'post_age_hours', post_age_hours, 'metrics_at', metrics_at,
          'views', views, 'reach', reach, 'likes', likes, 'comments', comments, 'saves', saves,
          'shares', shares, 'total_interactions', total_interactions, 'replies', replies,
          'engagement_rate', engagement_rate, 'views_24h', views_24h, 'views_7d', views_7d,
          'reels_avg_watch_time_ms', reels_avg_watch_time_ms, 'reels_skip_rate', reels_skip_rate,
          'comments_count', comments_count, 'stored_comments', stored_comments
        ) order by rn)
        from ordered where rn > v_offset and rn <= v_offset + v_limit
      ), '[]'::jsonb)
    )
  );
end $$;

-- ---------------------------------------------------------------------------
-- Kalender posting: post yang terbit pada 7 hari terakhir rentang (WIB)
-- ---------------------------------------------------------------------------
create or replace function public.ig_post_calendar(p_to date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'from', p_to - 6,
    'to', p_to,
    'posts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'content_kind', content_kind, 'caption', left(caption, 90),
        'posted_at', posted_at, 'date', (posted_at at time zone 'Asia/Jakarta')::date,
        'hour', posted_hour, 'minute', extract(minute from posted_at at time zone 'Asia/Jakarta')::int,
        'views', views
      ) order by posted_at)
      from ig.v_media_stats
      where (posted_at at time zone 'Asia/Jakarta')::date between p_to - 6 and p_to
    ), '[]'::jsonb)
  )
$$;

revoke all on function public.ig_post_calendar(date) from public, anon, authenticated;
grant execute on function public.ig_post_calendar(date) to service_role;
grant execute on function public.ig_dashboard_meta() to service_role;
grant execute on function public.ig_content(date, date, text, text, int, int) to service_role;

-- Dibuat oleh Faiz Hazim Hawari · skill-analysis
