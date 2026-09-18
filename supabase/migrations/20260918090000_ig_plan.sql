-- ============================================================================
-- Rencana kalender konten (menu "Rencana")
-- ----------------------------------------------------------------------------
-- Tabel pertama di project ini yang DITULIS dari web. Karena dashboard tanpa
-- login, aksi tulis di aplikasi dijaga PIN (env PLAN_EDIT_PIN) dan tetap lewat
-- function service_role seperti function baca lain: schema ig tidak pernah
-- diekspos ke anon/authenticated.
-- ============================================================================

create table if not exists ig.plan_events (
  id           uuid primary key default gen_random_uuid(),
  account_id   text references ig.accounts(id) on delete set null,
  title        text not null,
  event_type   text not null,
  status       text not null default 'rencana',
  starts_at    timestamptz not null,
  ends_at      timestamptz,
  all_day      boolean not null default false,
  description  text,
  location     text,
  owner        text,                                   -- penanggung jawab
  media_id     text references ig.media(id) on delete set null,  -- bila rencana posting sudah terbit
  is_sample    boolean not null default false,         -- contoh bawaan, bisa dihapus sekali klik
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint plan_events_title_len check (char_length(btrim(title)) between 1 and 120),
  constraint plan_events_type_valid check (event_type in ('shooting','posting','event','deadline','riset','editing','meeting','libur')),
  constraint plan_events_status_valid check (status in ('rencana','selesai','batal')),
  constraint plan_events_end_after_start check (ends_at is null or ends_at >= starts_at),
  constraint plan_events_desc_len check (description is null or char_length(description) <= 2000),
  constraint plan_events_location_len check (location is null or char_length(location) <= 120),
  constraint plan_events_owner_len check (owner is null or char_length(owner) <= 60)
);

-- Kalender selalu dibaca per rentang tanggal WIB.
create index if not exists plan_events_starts_idx on ig.plan_events (starts_at);

alter table ig.plan_events enable row level security;
grant select, insert, update, delete on ig.plan_events to service_role;

create or replace function ig.plan_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''   -- advisor Supabase: function tanpa search_path tetap = WARN
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists plan_events_touch on ig.plan_events;
create trigger plan_events_touch before update on ig.plan_events
for each row execute function ig.plan_touch_updated_at();

-- ---------------------------------------------------------------------------
-- Baca: acara pada rentang tanggal WIB + postingan yang benar-benar terbit
-- pada rentang yang sama (untuk membandingkan rencana dengan realisasi).
-- ---------------------------------------------------------------------------
create or replace function public.ig_plan_list(p_from date, p_to date, p_type text default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with ev as (
    select *
    from ig.plan_events
    where (starts_at at time zone 'Asia/Jakarta')::date <= p_to
      and (coalesce(ends_at, starts_at) at time zone 'Asia/Jakarta')::date >= p_from
      and (p_type is null or event_type = p_type)
  )
  select jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'title', title,
        'event_type', event_type,
        'status', status,
        'starts_at', starts_at,
        'ends_at', ends_at,
        'all_day', all_day,
        'description', description,
        'location', location,
        'owner', owner,
        'media_id', media_id,
        'is_sample', is_sample,
        'date', (starts_at at time zone 'Asia/Jakarta')::date,
        'end_date', (coalesce(ends_at, starts_at) at time zone 'Asia/Jakarta')::date,
        'hour', extract(hour from starts_at at time zone 'Asia/Jakarta')::int,
        'minute', extract(minute from starts_at at time zone 'Asia/Jakarta')::int,
        'updated_at', updated_at
      ) order by starts_at, title)
      from ev
    ), '[]'::jsonb),
    -- Ringkasan per jenis untuk seluruh rentang (tidak terpengaruh filter jenis)
    'by_type', coalesce((
      select jsonb_object_agg(event_type, n)
      from (
        select event_type, count(*) as n
        from ig.plan_events
        where (starts_at at time zone 'Asia/Jakarta')::date <= p_to
          and (coalesce(ends_at, starts_at) at time zone 'Asia/Jakarta')::date >= p_from
        group by event_type
      ) t
    ), '{}'::jsonb),
    'sample_count', (select count(*) from ig.plan_events where is_sample),
    'posts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'content_kind', content_kind,
        'caption', left(caption, 90),
        'posted_at', posted_at,
        'date', (posted_at at time zone 'Asia/Jakarta')::date,
        'hour', posted_hour,
        'minute', extract(minute from posted_at at time zone 'Asia/Jakarta')::int,
        'views', views
      ) order by posted_at)
      from ig.v_media_stats
      where (posted_at at time zone 'Asia/Jakarta')::date between p_from and p_to
    ), '[]'::jsonb)
  )
$$;

-- ---------------------------------------------------------------------------
-- Baca: acara terdekat untuk kartu di halaman Ringkasan
-- ---------------------------------------------------------------------------
create or replace function public.ig_plan_upcoming(p_limit int default 5)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with today_wib as (select (now() at time zone 'Asia/Jakarta')::date as d)
  select jsonb_build_object(
    'today', (select d from today_wib),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'title', title, 'event_type', event_type, 'status', status,
        'starts_at', starts_at, 'all_day', all_day, 'location', location, 'owner', owner,
        'description', left(description, 160),
        'date', (starts_at at time zone 'Asia/Jakarta')::date,
        'hour', extract(hour from starts_at at time zone 'Asia/Jakarta')::int,
        'minute', extract(minute from starts_at at time zone 'Asia/Jakarta')::int
      ) order by starts_at)
      from (
        select *
        from ig.plan_events
        where status <> 'batal'
          and (coalesce(ends_at, starts_at) at time zone 'Asia/Jakarta')::date >= (select d from today_wib)
        order by starts_at
        limit greatest(1, least(p_limit, 20))
      ) e
    ), '[]'::jsonb),
    'count_week', (
      select count(*) from ig.plan_events
      where status <> 'batal'
        and (starts_at at time zone 'Asia/Jakarta')::date
            between (select d from today_wib) and (select d from today_wib) + 6
    ),
    'count_month', (
      select count(*) from ig.plan_events
      where status <> 'batal'
        and date_trunc('month', starts_at at time zone 'Asia/Jakarta')
            = date_trunc('month', (now() at time zone 'Asia/Jakarta'))
    ),
    'count_overdue', (
      select count(*) from ig.plan_events
      where status = 'rencana'
        and (coalesce(ends_at, starts_at) at time zone 'Asia/Jakarta')::date < (select d from today_wib)
    )
  )
$$;

-- ---------------------------------------------------------------------------
-- Tulis: satu function untuk tambah dan ubah. Validasi tetap di sini supaya
-- tidak bergantung pada pemeriksaan di aplikasi saja.
-- ---------------------------------------------------------------------------
create or replace function public.ig_plan_upsert(
  p_id          uuid,
  p_title       text,
  p_event_type  text,
  p_status      text,
  p_starts_at   timestamptz,
  p_ends_at     timestamptz,
  p_all_day     boolean,
  p_description text,
  p_location    text,
  p_owner       text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_row ig.plan_events;
  v_title text := btrim(coalesce(p_title, ''));
begin
  if char_length(v_title) = 0 then
    raise exception 'Judul acara wajib diisi' using errcode = '22023';
  end if;

  if p_id is null then
    insert into ig.plan_events (
      account_id, title, event_type, status, starts_at, ends_at, all_day, description, location, owner
    )
    values (
      (select id from ig.accounts order by connected_at limit 1),
      v_title, p_event_type, coalesce(p_status, 'rencana'), p_starts_at, p_ends_at,
      coalesce(p_all_day, false), nullif(btrim(coalesce(p_description, '')), ''),
      nullif(btrim(coalesce(p_location, '')), ''), nullif(btrim(coalesce(p_owner, '')), '')
    )
    returning * into v_row;
  else
    update ig.plan_events set
      title       = v_title,
      event_type  = p_event_type,
      status      = coalesce(p_status, status),
      starts_at   = p_starts_at,
      ends_at     = p_ends_at,
      all_day     = coalesce(p_all_day, false),
      description = nullif(btrim(coalesce(p_description, '')), ''),
      location    = nullif(btrim(coalesce(p_location, '')), ''),
      owner       = nullif(btrim(coalesce(p_owner, '')), ''),
      is_sample   = false            -- contoh yang sudah diedit jadi milik tim
    where id = p_id
    returning * into v_row;

    if v_row.id is null then
      raise exception 'Acara tidak ditemukan' using errcode = 'P0002';
    end if;
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'date', (v_row.starts_at at time zone 'Asia/Jakarta')::date,
    'title', v_row.title
  );
end;
$$;

create or replace function public.ig_plan_delete(p_id uuid)
returns jsonb
language sql
volatile
security definer
set search_path = ''
as $$
  with d as (delete from ig.plan_events where id = p_id returning 1)
  select jsonb_build_object('deleted', (select count(*) from d));
$$;

create or replace function public.ig_plan_delete_samples()
returns jsonb
language sql
volatile
security definer
set search_path = ''
as $$
  with d as (delete from ig.plan_events where is_sample returning 1)
  select jsonb_build_object('deleted', (select count(*) from d));
$$;

revoke all on function public.ig_plan_list(date, date, text) from public, anon, authenticated;
revoke all on function public.ig_plan_upcoming(int) from public, anon, authenticated;
revoke all on function public.ig_plan_upsert(uuid, text, text, text, timestamptz, timestamptz, boolean, text, text, text) from public, anon, authenticated;
revoke all on function public.ig_plan_delete(uuid) from public, anon, authenticated;
revoke all on function public.ig_plan_delete_samples() from public, anon, authenticated;

grant execute on function public.ig_plan_list(date, date, text) to service_role;
grant execute on function public.ig_plan_upcoming(int) to service_role;
grant execute on function public.ig_plan_upsert(uuid, text, text, text, timestamptz, timestamptz, boolean, text, text, text) to service_role;
grant execute on function public.ig_plan_delete(uuid) to service_role;
grant execute on function public.ig_plan_delete_samples() to service_role;

-- ---------------------------------------------------------------------------
-- Contoh isi (is_sample = true) di minggu berjalan WIB, supaya kalender tidak
-- kosong saat pertama dibuka. Bisa dihapus sekaligus dari halaman Rencana.
-- Jalan sekali: kalau sudah ada contoh, tidak menambah lagi.
-- ---------------------------------------------------------------------------
insert into ig.plan_events (title, event_type, status, starts_at, ends_at, all_day, description, location, owner, is_sample)
select * from (
  with w as (
    -- Senin minggu ini, pukul 00.00 WIB
    select date_trunc('week', (now() at time zone 'Asia/Jakarta'))::date as senin
  )
  select
    'Contoh: Riset ide konten pekan depan'::text,
    'riset'::text, 'selesai'::text,
    ((select senin from w) + time '09:00') at time zone 'Asia/Jakarta',
    ((select senin from w) + time '11:00') at time zone 'Asia/Jakarta',
    false,
    'Kumpulkan ide dari komentar dan tren. Hasil: 5 judul konten siap dieksekusi.'::text,
    'Kantor Holding'::text, 'Tim Konten'::text, true
  union all
  select
    'Contoh: Shooting profil karyawan kebun',
    'shooting', 'rencana',
    ((select senin from w) + 2 + time '08:00') at time zone 'Asia/Jakarta',
    ((select senin from w) + 2 + time '15:00') at time zone 'Asia/Jakarta',
    false,
    E'Ambil b-roll aktivitas panen dan wawancara 2 karyawan.\nBawa: kamera, clip on, drone, rilis izin narasumber.',
    'Kebun Sei Putih', 'Tim Produksi', true
  union all
  select
    'Contoh: Editing reels panen',
    'editing', 'rencana',
    ((select senin from w) + 3 + time '13:00') at time zone 'Asia/Jakarta',
    ((select senin from w) + 3 + time '17:00') at time zone 'Asia/Jakarta',
    false,
    'Target durasi 45 detik, subtitle bahasa Indonesia, musik tanpa hak cipta.',
    null, 'Editor', true
  union all
  select
    'Contoh: Posting reels panen',
    'posting', 'rencana',
    ((select senin from w) + 4 + time '12:00') at time zone 'Asia/Jakarta',
    null, false,
    E'Jam 12.00 WIB mengikuti slot terbaik di menu Waktu Posting.\nCaption + 5 hashtag, tag akun kebun.',
    null, 'Admin IG', true
  union all
  select
    'Contoh: Batas kirim laporan bulanan',
    'deadline', 'rencana',
    ((select senin from w) + 4 + time '16:00') at time zone 'Asia/Jakarta',
    null, false,
    'Unduh Excel dari menu Laporan, kirim ke Sekper sebelum pukul 16.00.',
    null, 'Tim Konten', true
) s
where not exists (select 1 from ig.plan_events);

-- Dibuat oleh Faiz Hazim Hawari · skill-analysis
