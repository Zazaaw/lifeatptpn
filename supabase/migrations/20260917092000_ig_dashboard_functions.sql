-- ============================================================================
-- Function baca untuk dashboard lifeatptpn-insight
-- ----------------------------------------------------------------------------
-- * Hanya service_role yang boleh execute. Next.js memanggilnya dari server
--   (tidak pernah dari browser), jadi schema ig tidak perlu diekspos ke API.
-- * Semua logika angka (ER, median, views@24 jam, pembanding periode) ada di
--   sini supaya halaman, laporan, dan file Excel memakai hitungan yang sama.
-- * Tanggal post memakai WIB (Asia/Jakarta). Metrik harian akun memakai
--   tanggal hari Meta (lihat komentar ig.account_daily).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Nilai metrik pada umur post tertentu (mis. views pada 24 jam).
-- Interpolasi linear dua snapshot yang mengapit target, dengan batas jarak
-- supaya tidak "mengarang" angka dari snapshot yang terlalu jauh.
-- Hasil NULL = data belum cukup (post belum setua target, atau post sudah
-- lama saat sync pertama berjalan sehingga tidak ada snapshot di sekitar target).
-- ---------------------------------------------------------------------------
create or replace function ig.views_at_age(p_media_id text, p_hours numeric)
returns numeric
language sql
stable
set search_path = ''
as $$
  with before as (
    select post_age_hours as a, views as v from ig.media_snapshots
    where media_id = p_media_id and views is not null and post_age_hours <= p_hours
    order by post_age_hours desc limit 1
  ), after as (
    select post_age_hours as a, views as v from ig.media_snapshots
    where media_id = p_media_id and views is not null and post_age_hours >= p_hours
    order by post_age_hours asc limit 1
  )
  select case
    when af.a = p_hours then af.v
    when bf.a is not null and af.a is not null
         and bf.a >= p_hours * 0.5 and af.a <= p_hours * 1.5 and af.a > bf.a
      then round(bf.v + (af.v - bf.v) * (p_hours - bf.a) / (af.a - bf.a))
    when af.a is not null and af.a <= p_hours + 2 then af.v
    else null
  end
  from (select 1) x
  left join before bf on true
  left join after af on true
$$;

-- ---------------------------------------------------------------------------
-- Statistik terbaru per post
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
  ig.views_at_age(m.id, 168) as views_7d
from ig.media m
left join lateral (
  select * from ig.media_snapshots ms
  where ms.media_id = m.id
  order by ms.captured_at desc
  limit 1
) s on true;

-- ---------------------------------------------------------------------------
-- Info umum: akun, kesegaran data, cakupan histori
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
    'token_note', (select description from vault.secrets where name = 'ig_access_token'),
    'token_updated_at', (select updated_at from vault.secrets where name = 'ig_access_token')
  )
$$;

-- ---------------------------------------------------------------------------
-- Ringkasan akun untuk rentang tanggal + periode pembanding sepanjang sama
-- ---------------------------------------------------------------------------
create or replace function public.ig_overview(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days int := (p_to - p_from) + 1;
  v_prev_from date := p_from - ((p_to - p_from) + 1);
  v_prev_to date := p_from - 1;
  v_result jsonb;
begin
  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'Rentang tanggal tidak valid';
  end if;
  if v_days > 800 then
    raise exception 'Rentang maksimal 800 hari';
  end if;

  with totals as (
    select
      case when metric_date between p_from and p_to then 'current' else 'previous' end as period,
      count(*) filter (where views is not null) as days_with_data,
      sum(views) as views,
      sum(total_interactions) as total_interactions,
      sum(likes) as likes, sum(comments) as comments, sum(shares) as shares, sum(saves) as saves,
      sum(profile_views) as profile_views, sum(website_clicks) as website_clicks,
      round(avg(reach)) as reach_avg_daily,
      sum(accounts_engaged) as accounts_engaged_sum,
      sum(new_followers) as new_followers,
      count(new_followers) as new_followers_days
    from ig.account_daily
    where metric_date between v_prev_from and p_to
    group by 1
  ),
  posts as (
    select
      case when (posted_at at time zone 'Asia/Jakarta')::date between p_from and p_to then 'current' else 'previous' end as period,
      count(*) as posts,
      sum(views) as views,
      round(percentile_cont(0.5) within group (order by views)) as median_views,
      round(percentile_cont(0.5) within group (order by engagement_rate)::numeric, 6) as median_er
    from ig.v_media_stats
    where content_kind <> 'story'
      and (posted_at at time zone 'Asia/Jakarta')::date between v_prev_from and p_to
    group by 1
  )
  select jsonb_build_object(
    'range', jsonb_build_object('from', p_from, 'to', p_to, 'days', v_days,
                                'prev_from', v_prev_from, 'prev_to', v_prev_to),
    'current', coalesce((select to_jsonb(t) - 'period' from totals t where period = 'current'), '{}'::jsonb),
    'previous', coalesce((select to_jsonb(t) - 'period' from totals t where period = 'previous'), '{}'::jsonb),
    'posts_current', coalesce((select to_jsonb(p) - 'period' from posts p where period = 'current'), '{}'::jsonb),
    'posts_previous', coalesce((select to_jsonb(p) - 'period' from posts p where period = 'previous'), '{}'::jsonb),
    'followers', jsonb_build_object(
      'latest', (select jsonb_build_object('date', metric_date, 'value', followers_total)
                 from ig.account_daily where followers_total is not null
                 order by metric_date desc limit 1),
      'at_start', (select jsonb_build_object('date', metric_date, 'value', followers_total)
                   from ig.account_daily where followers_total is not null and metric_date <= p_from
                   order by metric_date desc limit 1),
      'at_end', (select jsonb_build_object('date', metric_date, 'value', followers_total)
                 from ig.account_daily where followers_total is not null and metric_date <= p_to
                 order by metric_date desc limit 1)
    ),
    'series', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', d.day::date, 'views', ad.views, 'reach', ad.reach, 'total_interactions', ad.total_interactions,
        'new_followers', ad.new_followers, 'followers_total', ad.followers_total
      ) order by d.day)
      from generate_series(p_from, p_to, interval '1 day') as d(day)
      left join ig.account_daily ad on ad.metric_date = d.day::date
    ), '[]'::jsonb),
    'kinds', coalesce((
      select jsonb_agg(k order by k.views desc nulls last) from (
        select content_kind as kind, count(*) as posts, sum(views) as views,
               round(percentile_cont(0.5) within group (order by views)) as median_views,
               round(percentile_cont(0.5) within group (order by engagement_rate)::numeric, 6) as median_er
        from ig.v_media_stats
        where content_kind <> 'story' and (posted_at at time zone 'Asia/Jakarta')::date between p_from and p_to
        group by content_kind
      ) k
    ), '[]'::jsonb),
    'top_posts', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.views desc nulls last) from (
        select id, content_kind, left(caption, 160) as caption, permalink, thumb_url, posted_at,
               views, reach, total_interactions, engagement_rate, views_24h
        from ig.v_media_stats
        where content_kind <> 'story' and (posted_at at time zone 'Asia/Jakarta')::date between p_from and p_to
        order by views desc nulls last
        limit 5
      ) t
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end $$;

-- ---------------------------------------------------------------------------
-- Daftar konten dengan filter, urutan, dan paging
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
  if v_sort not in ('views','views_24h','views_7d','engagement_rate','reach','shares','saves','posted_at') then
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
            when 'shares' then shares::numeric when 'saves' then saves::numeric else 1 end is not null),
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
          'reels_avg_watch_time_ms', reels_avg_watch_time_ms, 'reels_skip_rate', reels_skip_rate
        ) order by rn)
        from ordered where rn > v_offset and rn <= v_offset + v_limit
      ), '[]'::jsonb)
    )
  );
end $$;

-- ---------------------------------------------------------------------------
-- Detail satu post + riwayat snapshot
-- ---------------------------------------------------------------------------
create or replace function public.ig_media_detail(p_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when s.id is null then null else jsonb_build_object(
    'media', to_jsonb(s),
    'snapshots', coalesce((
      select jsonb_agg(jsonb_build_object(
        'captured_at', captured_at, 'post_age_hours', post_age_hours, 'views', views, 'reach', reach,
        'likes', likes, 'comments', comments, 'saves', saves, 'shares', shares,
        'total_interactions', total_interactions
      ) order by captured_at)
      from ig.media_snapshots where media_id = p_id
    ), '[]'::jsonb)
  ) end
  from (select 1) x
  left join ig.v_media_stats s on s.id = p_id
$$;

-- ---------------------------------------------------------------------------
-- Waktu posting terbaik: hari × jam WIB, median, jumlah sampel
-- p_metric: views_24h | views_mature (views terbaru post umur ≥ 7 hari) | engagement_rate
-- ---------------------------------------------------------------------------
create or replace function public.ig_best_time(
  p_from date,
  p_to date,
  p_metric text default 'views_mature',
  p_kind text default null,
  p_min_samples int default 3
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_min int := greatest(coalesce(p_min_samples, 3), 1);
begin
  if p_metric not in ('views_24h','views_mature','engagement_rate') then
    raise exception 'Metrik tidak dikenal: %', p_metric;
  end if;
  if p_kind is not null and p_kind not in ('reels','carousel','foto','video') then
    raise exception 'Jenis konten tidak dikenal: %', p_kind;
  end if;

  return (
    with base as (
      select id, posted_dow as dow, posted_hour as hour,
        case p_metric
          when 'views_24h' then views_24h
          when 'views_mature' then case when post_age_hours >= 168 then views::numeric end
          when 'engagement_rate' then case when post_age_hours >= 48 then engagement_rate end
        end as value
      from ig.v_media_stats
      where content_kind <> 'story'
        and (posted_at at time zone 'Asia/Jakarta')::date between p_from and p_to
        and (p_kind is null or content_kind = p_kind)
    ), valued as (
      select * from base where value is not null
    )
    select jsonb_build_object(
      'metric', p_metric,
      'min_samples', v_min,
      'posts_in_range', (select count(*) from base),
      'posts_with_value', (select count(*) from valued),
      'overall_median', (select percentile_cont(0.5) within group (order by value) from valued),
      'cells', coalesce((
        select jsonb_agg(jsonb_build_object('dow', dow, 'hour', hour, 'n', n, 'median', med, 'valid', n >= v_min) order by dow, hour)
        from (select dow, hour, count(*) as n, percentile_cont(0.5) within group (order by value) as med
              from valued group by dow, hour) c
      ), '[]'::jsonb),
      'by_dow', coalesce((
        select jsonb_agg(jsonb_build_object('dow', dow, 'n', n, 'median', med, 'valid', n >= v_min) order by dow)
        from (select dow, count(*) as n, percentile_cont(0.5) within group (order by value) as med
              from valued group by dow) c
      ), '[]'::jsonb),
      'by_hour', coalesce((
        select jsonb_agg(jsonb_build_object('hour', hour, 'n', n, 'median', med, 'valid', n >= v_min) order by hour)
        from (select hour, count(*) as n, percentile_cont(0.5) within group (order by value) as med
              from valued group by hour) c
      ), '[]'::jsonb),
      'online_followers', coalesce((
        select jsonb_agg(jsonb_build_object('hour', hour_wib, 'avg', avg_value, 'days', days) order by hour_wib)
        from (select hour_wib, round(avg(value)) as avg_value, count(*) as days
              from ig.online_followers
              where captured_date >= (select max(captured_date) - 27 from ig.online_followers)
              group by hour_wib) o
      ), '[]'::jsonb)
    )
  );
end $$;

-- ---------------------------------------------------------------------------
-- Audiens: snapshot demografi terbaru + jam online follower
-- ---------------------------------------------------------------------------
create or replace function public.ig_audience()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with latest as (
    select metric, breakdown_type, max(captured_date) as captured_date
    from ig.audience_demographics group by metric, breakdown_type
  )
  select jsonb_build_object(
    'demographics', coalesce((
      select jsonb_agg(jsonb_build_object(
        'metric', d.metric, 'type', d.breakdown_type, 'value', d.breakdown_value,
        'count', d.value, 'captured_date', d.captured_date
      ) order by d.metric, d.breakdown_type, d.value desc)
      from ig.audience_demographics d
      join latest l using (metric, breakdown_type, captured_date)
    ), '[]'::jsonb),
    'online_followers', coalesce((
      select jsonb_agg(jsonb_build_object('hour', hour_wib, 'avg', avg_value, 'days', days) order by hour_wib)
      from (select hour_wib, round(avg(value)) as avg_value, count(*) as days
            from ig.online_followers
            where captured_date >= (select max(captured_date) - 27 from ig.online_followers)
            group by hour_wib) o
    ), '[]'::jsonb),
    'online_range', (select jsonb_build_object('from', max(captured_date) - 27, 'to', max(captured_date)) from ig.online_followers),
    'followers_total', (select followers_count from ig.accounts order by connected_at limit 1)
  )
$$;

revoke all on function ig.views_at_age(text, numeric) from public, anon, authenticated;
revoke all on function public.ig_dashboard_meta() from public, anon, authenticated;
revoke all on function public.ig_overview(date, date) from public, anon, authenticated;
revoke all on function public.ig_content(date, date, text, text, int, int) from public, anon, authenticated;
revoke all on function public.ig_media_detail(text) from public, anon, authenticated;
revoke all on function public.ig_best_time(date, date, text, text, int) from public, anon, authenticated;
revoke all on function public.ig_audience() from public, anon, authenticated;

grant execute on function ig.views_at_age(text, numeric) to service_role;
grant execute on function public.ig_dashboard_meta() to service_role;
grant execute on function public.ig_overview(date, date) to service_role;
grant execute on function public.ig_content(date, date, text, text, int, int) to service_role;
grant execute on function public.ig_media_detail(text) to service_role;
grant execute on function public.ig_best_time(date, date, text, text, int) to service_role;
grant execute on function public.ig_audience() to service_role;
grant select on ig.v_media_stats to service_role;

-- Dibuat oleh Faiz Hazim Hawari · skill-analysis
