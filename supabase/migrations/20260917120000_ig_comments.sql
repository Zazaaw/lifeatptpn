-- ============================================================================
-- Komentar per postingan + data untuk Spin Wheel kuis
-- ----------------------------------------------------------------------------
-- Butuh izin token `instagram_business_manage_comments` dan app Meta dalam
-- mode Live. Tanpa itu API mengembalikan daftar kosong TANPA galat; edge
-- function mendeteksinya dan dashboard menampilkan peringatan, bukan "0 komentar".
-- ============================================================================

alter table ig.media
  add column if not exists comments_count integer,          -- dari field media.comments_count (termasuk balasan)
  add column if not exists like_count integer,
  add column if not exists comments_synced_at timestamptz,  -- terakhir seluruh komentar post ini selesai diambil
  add column if not exists comments_synced_for integer;     -- comments_count saat sync itu (deteksi perubahan)

create table if not exists ig.comments (
  id             text primary key,
  media_id       text not null references ig.media(id) on delete cascade,
  parent_id      text,                          -- terisi untuk balasan
  username       text,
  from_id        text,
  text           text,
  like_count     integer,
  commented_at   timestamptz not null,
  first_seen_at  timestamptz not null default now(),
  last_seen_at   timestamptz not null default now(),
  removed_at     timestamptz                    -- tidak muncul lagi saat sync penuh (dihapus/disembunyikan)
);
create index if not exists comments_media_time_idx on ig.comments (media_id, commented_at);
create index if not exists comments_username_idx on ig.comments (lower(username));

alter table ig.comments enable row level security;
grant select, insert, update, delete on ig.comments to service_role;

-- ---------------------------------------------------------------------------
-- Komentar satu post (balasan disarangkan), dengan pencarian & paging
-- ---------------------------------------------------------------------------
create or replace function public.ig_media_comments(
  p_id text,
  p_search text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_search text := nullif(trim(coalesce(p_search, '')), '');
begin
  return (
    with live as (
      select * from ig.comments where media_id = p_id and removed_at is null
    ), top as (
      select c.* from live c
      where c.parent_id is null
        and (v_search is null
             or c.text ilike '%' || v_search || '%'
             or c.username ilike '%' || v_search || '%'
             or exists (select 1 from live r where r.parent_id = c.id
                        and (r.text ilike '%' || v_search || '%' or r.username ilike '%' || v_search || '%')))
    )
    select jsonb_build_object(
      'media', (select jsonb_build_object('id', id, 'comments_count', comments_count,
                                          'comments_synced_at', comments_synced_at,
                                          'comments_synced_for', comments_synced_for)
                from ig.media where id = p_id),
      'stored', (select count(*) from live),
      'unique_accounts', (select count(distinct lower(username)) from live),
      'matched', (select count(*) from top),
      'limit', v_limit,
      'offset', v_offset,
      'top_accounts', coalesce((
        select jsonb_agg(jsonb_build_object('username', username, 'n', n) order by n desc, username)
        from (select username, count(*) as n from live where username is not null
              group by username order by count(*) desc, username limit 5) t
      ), '[]'::jsonb),
      'rows', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', t.id, 'username', t.username, 'text', t.text, 'like_count', t.like_count,
          'commented_at', t.commented_at,
          'replies', coalesce((
            select jsonb_agg(jsonb_build_object('id', r.id, 'username', r.username, 'text', r.text,
                                                'like_count', r.like_count, 'commented_at', r.commented_at)
                             order by r.commented_at)
            from live r where r.parent_id = t.id
          ), '[]'::jsonb)
        ) order by t.commented_at)
        from (select * from top order by commented_at limit v_limit offset v_offset) t
      ), '[]'::jsonb)
    )
  );
end $$;

-- ---------------------------------------------------------------------------
-- Pilihan post untuk Spin Wheel
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
           coalesce(m.thumbnail_url, m.media_url) as thumb_url, m.posted_at,
           m.comments_count, m.comments_synced_at,
           (select count(*) from ig.comments c where c.media_id = m.id and c.removed_at is null) as stored_comments
    from ig.media m
    where m.content_kind <> 'story'
    order by m.posted_at desc
    limit least(greatest(coalesce(p_limit, 60), 1), 200)
  ) p
$$;

-- ---------------------------------------------------------------------------
-- Peserta Spin Wheel dari komentar satu post
--   p_keyword       : komentar harus memuat kata ini (tidak peka huruf besar/kecil)
--   p_until         : hanya komentar sebelum batas waktu kuis
--   p_exclude       : username yang dikecualikan (mis. akun sendiri, panitia)
--   p_include_replies: ikutkan balasan sebagai komentar
-- Satu akun = satu baris; kolom n = jumlah komentar yang lolos filter.
-- ---------------------------------------------------------------------------
create or replace function public.ig_quiz_entries(
  p_media_id text,
  p_keyword text default null,
  p_until timestamptz default null,
  p_exclude text[] default '{}',
  p_include_replies boolean default false
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_keyword text := nullif(trim(coalesce(p_keyword, '')), '');
  v_exclude text[] := (select coalesce(array_agg(lower(trim(both '@ ' from x))), '{}')
                       from unnest(coalesce(p_exclude, '{}')) x where trim(x) <> '');
begin
  return (
    with base as (
      select c.* from ig.comments c
      where c.media_id = p_media_id and c.removed_at is null and c.username is not null
        and (p_include_replies or c.parent_id is null)
    ), filtered as (
      select * from base
      where (v_keyword is null or text ilike '%' || v_keyword || '%')
        and (p_until is null or commented_at <= p_until)
        and not (lower(username) = any (v_exclude))
    )
    select jsonb_build_object(
      'comments_considered', (select count(*) from base),
      'comments_matched', (select count(*) from filtered),
      'entries', coalesce((
        select jsonb_agg(jsonb_build_object('username', username, 'n', n, 'first_at', first_at, 'sample', sample)
                         order by first_at)
        from (
          select username, count(*) as n, min(commented_at) as first_at,
                 (array_agg(left(text, 120) order by commented_at))[1] as sample
          from filtered group by username
        ) e
      ), '[]'::jsonb)
    )
  );
end $$;

revoke all on function public.ig_media_comments(text, text, int, int) from public, anon, authenticated;
revoke all on function public.ig_quiz_posts(int) from public, anon, authenticated;
revoke all on function public.ig_quiz_entries(text, text, timestamptz, text[], boolean) from public, anon, authenticated;
grant execute on function public.ig_media_comments(text, text, int, int) to service_role;
grant execute on function public.ig_quiz_posts(int) to service_role;
grant execute on function public.ig_quiz_entries(text, text, timestamptz, text[], boolean) to service_role;

-- Dibuat oleh Faiz Hazim Hawari · skill-analysis
