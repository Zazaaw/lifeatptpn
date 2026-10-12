-- ============================================================================
-- Content Plan (menu Rencana, arah baru 12 Okt 2026, permintaan user)
-- ----------------------------------------------------------------------------
-- Menggantikan kalender "8 jenis acara" (ig.plan_events) dengan rencana konten
-- per pilar dan rubrik sesuai mockup tim: progres produksi 4 tahap, status,
-- PIC, dan tautan ke post Instagram yang benar-benar terbit (foto dari cermin
-- Storage ig-thumbs). ig.plan_events TIDAK dihapus (masih berisi data asli);
-- hanya tidak dipakai halaman lagi.
--
-- Daftar pilar, rubrik, format, status, dan tahap juga ada di
-- src/lib/content-plan.ts. Mengubah salah satunya wajib mengubah keduanya.
-- Aksi tulis tetap dijaga PIN di server action (assertUnlocked) dan hanya
-- lewat function service_role; schema ig tidak diekspos ke anon.
-- ============================================================================

create table if not exists ig.content_plan (
  id             uuid primary key default gen_random_uuid(),
  account_id     text references ig.accounts(id) on delete set null,
  planned_on     date not null,                                   -- tanggal tayang rencana (WIB)
  title          text not null,
  summary        text,                                            -- satu baris keterangan di bawah judul
  pillar         text not null,
  rubrik         text,                                            -- boleh kosong: tidak semua konten masuk rubrik
  format         text not null,
  status         text not null default 'rencana',
  stage_script   text not null default 'belum',
  stage_editing  text not null default 'belum',
  stage_review   text not null default 'belum',
  stage_upload   text not null default 'belum',
  pic            text,                                            -- penanggung jawab
  media_id       text references ig.media(id) on delete set null, -- post Instagram realisasinya
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint content_plan_title_len check (char_length(btrim(title)) between 1 and 140),
  constraint content_plan_summary_len check (summary is null or char_length(summary) <= 300),
  constraint content_plan_pic_len check (pic is null or char_length(pic) <= 60),
  constraint content_plan_notes_len check (notes is null or char_length(notes) <= 2000),
  constraint content_plan_pillar_valid check (pillar in (
    'business_savvy','operational_excellence','risk_culture','digital_culture',
    'innovation_culture','esg','humanizing_human','rwp')),
  constraint content_plan_rubrik_valid check (rubrik is null or rubrik in (
    'lifeasnusantaraentreplanters','oneweekonetips','respectfulinclusiveworkplace','tumbuhdiptpn',
    'ceritainovator','levelupchangeagent','motivasientreplanters','sipalingculture')),
  constraint content_plan_format_valid check (format in ('reels','carousel','poster','story','video')),
  constraint content_plan_status_valid check (status in ('rencana','produksi','editing','review','published')),
  constraint content_plan_stages_valid check (
    stage_script in ('belum','proses','selesai') and stage_editing in ('belum','proses','selesai')
    and stage_review in ('belum','proses','selesai') and stage_upload in ('belum','proses','selesai'))
);

-- Tabel selalu dibaca per rentang tanggal tayang.
create index if not exists content_plan_planned_idx on ig.content_plan (planned_on);
-- Satu post Instagram hanya boleh menjadi realisasi satu rencana.
create unique index if not exists content_plan_media_uniq on ig.content_plan (media_id) where media_id is not null;

alter table ig.content_plan enable row level security;
grant select, insert, update, delete on ig.content_plan to service_role;

drop trigger if exists content_plan_touch on ig.content_plan;
create trigger content_plan_touch before update on ig.content_plan
for each row execute function ig.plan_touch_updated_at();

-- ---------------------------------------------------------------------------
-- Baca: KPI periode, jumlah per pilar dan rubrik, lalu baris tabel yang sudah
-- difilter. KPI dan hitungan pilar/rubrik memakai PERIODE saja (tidak ikut
-- filter tabel) supaya kartu di atas tetap menunjukkan gambaran utuh.
--
-- KPI adalah partisi (jumlahnya = total), dengan urutan prioritas:
--   published > overdue (lewat tanggal, belum published) > review > on progress
-- p_from/p_to null = tampilan "Daftar" (semua tanggal, terbaru di atas).
-- ---------------------------------------------------------------------------
create or replace function public.ig_cp_list(
  p_from date default null,
  p_to date default null,
  p_pillar text default null,
  p_rubrik text default null,
  p_format text default null,
  p_status text default null,
  p_q text default null,
  p_limit int default 300
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with today as (
    select (now() at time zone 'Asia/Jakarta')::date as d
  ),
  period as (
    select c.*, (c.status <> 'published' and c.planned_on < (select d from today)) as overdue
    from ig.content_plan c
    where (p_from is null or c.planned_on >= p_from)
      and (p_to is null or c.planned_on <= p_to)
  ),
  filtered as (
    select p.*
    from period p
    where (p_pillar is null or p.pillar = p_pillar)
      and (p_rubrik is null or p.rubrik = p_rubrik)
      and (p_format is null or p.format = p_format)
      and (p_status is null or case when p_status = 'overdue' then p.overdue else p.status = p_status end)
      -- strpos, bukan LIKE: karakter % dan _ dari kotak cari tidak jadi wildcard.
      and (p_q is null or btrim(p_q) = ''
           or strpos(lower(p.title || ' ' || coalesce(p.summary, '') || ' ' || coalesce(p.pic, '')), lower(btrim(p_q))) > 0)
  ),
  rubrik(slug) as (
    values ('lifeasnusantaraentreplanters'), ('oneweekonetips'), ('respectfulinclusiveworkplace'), ('tumbuhdiptpn'),
           ('ceritainovator'), ('levelupchangeagent'), ('motivasientreplanters'), ('sipalingculture')
  ),
  lim as (
    select least(greatest(coalesce(p_limit, 300), 1), 500) as n
  )
  select jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'today', (select d from today),
    'kpi', (
      select jsonb_build_object(
        'total', count(*),
        'published', count(*) filter (where status = 'published'),
        'overdue', count(*) filter (where overdue),
        'review', count(*) filter (where not overdue and status = 'review'),
        'on_progress', count(*) filter (where not overdue and status in ('rencana', 'produksi', 'editing'))
      )
      from period
    ),
    'by_pillar', coalesce((select jsonb_object_agg(pillar, n) from (select pillar, count(*) as n from period group by pillar) x), '{}'::jsonb),
    -- plan  = rencana di periode ini yang memakai rubrik tersebut
    -- posts = post Instagram di periode ini yang captionnya memuat #rubrik (data nyata)
    'by_rubrik', (
      select jsonb_object_agg(r.slug, jsonb_build_object(
        'plan', (select count(*) from period p where p.rubrik = r.slug),
        'posts', (
          select count(*)
          from ig.media m
          where m.content_kind <> 'story'
            and m.caption ilike '%#' || r.slug || '%'
            and (p_from is null or (m.posted_at at time zone 'Asia/Jakarta')::date >= p_from)
            and (p_to is null or (m.posted_at at time zone 'Asia/Jakarta')::date <= p_to)
        )
      ))
      from rubrik r
    ),
    'items_total', (select count(*) from filtered),
    'limit', (select n from lim),
    'items', coalesce((
      select jsonb_agg(x.j order by x.k1, x.k2)
      from (
        select
          jsonb_build_object(
            'id', f.id,
            'planned_on', f.planned_on,
            'title', f.title,
            'summary', f.summary,
            'pillar', f.pillar,
            'rubrik', f.rubrik,
            'format', f.format,
            'status', f.status,
            'overdue', f.overdue,
            'stages', jsonb_build_object(
              'script', f.stage_script, 'editing', f.stage_editing,
              'review', f.stage_review, 'upload', f.stage_upload
            ),
            'pic', f.pic,
            'notes', f.notes,
            'updated_at', f.updated_at,
            'media', case when m.id is null then null else jsonb_build_object(
              'id', m.id,
              'permalink', m.permalink,
              'posted_at', m.posted_at,
              'content_kind', m.content_kind,
              'thumb_url', coalesce(m.image_url, m.thumbnail_url, m.media_url)
            ) end
          ) as j,
          -- Periode: urut tanggal naik (seperti kalender). Daftar: terbaru di atas.
          case when p_from is null then -(f.planned_on - date '2000-01-01') else (f.planned_on - date '2000-01-01') end as k1,
          f.created_at as k2
        from filtered f
        left join ig.media m on m.id = f.media_id
        order by k1, k2
        limit (select n from lim)
      ) x
    ), '[]'::jsonb),
    'pics', coalesce((select jsonb_agg(distinct c.pic order by c.pic) from ig.content_plan c where c.pic is not null), '[]'::jsonb)
  )
$$;

-- ---------------------------------------------------------------------------
-- Tulis: tambah / ubah satu konten. Validasi isian ada dua lapis: server
-- action (pesan ramah) dan constraint tabel (pengaman terakhir).
-- ---------------------------------------------------------------------------
create or replace function public.ig_cp_upsert(
  p_id uuid,
  p_planned_on date,
  p_title text,
  p_summary text,
  p_pillar text,
  p_rubrik text,
  p_format text,
  p_status text,
  p_stage_script text,
  p_stage_editing text,
  p_stage_review text,
  p_stage_upload text,
  p_pic text,
  p_media_id text,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_id is null then
    insert into ig.content_plan (
      account_id, planned_on, title, summary, pillar, rubrik, format, status,
      stage_script, stage_editing, stage_review, stage_upload, pic, media_id, notes
    )
    values (
      (select a.id from ig.accounts a order by a.connected_at limit 1),
      p_planned_on, btrim(p_title), nullif(btrim(p_summary), ''), p_pillar, nullif(p_rubrik, ''), p_format,
      coalesce(nullif(p_status, ''), 'rencana'),
      coalesce(nullif(p_stage_script, ''), 'belum'), coalesce(nullif(p_stage_editing, ''), 'belum'),
      coalesce(nullif(p_stage_review, ''), 'belum'), coalesce(nullif(p_stage_upload, ''), 'belum'),
      nullif(btrim(p_pic), ''), nullif(p_media_id, ''), nullif(btrim(p_notes), '')
    )
    returning id into v_id;
  else
    update ig.content_plan set
      planned_on = p_planned_on,
      title = btrim(p_title),
      summary = nullif(btrim(p_summary), ''),
      pillar = p_pillar,
      rubrik = nullif(p_rubrik, ''),
      format = p_format,
      status = coalesce(nullif(p_status, ''), 'rencana'),
      stage_script = coalesce(nullif(p_stage_script, ''), 'belum'),
      stage_editing = coalesce(nullif(p_stage_editing, ''), 'belum'),
      stage_review = coalesce(nullif(p_stage_review, ''), 'belum'),
      stage_upload = coalesce(nullif(p_stage_upload, ''), 'belum'),
      pic = nullif(btrim(p_pic), ''),
      media_id = nullif(p_media_id, ''),
      notes = nullif(btrim(p_notes), '')
    where id = p_id
    returning id into v_id;
    if v_id is null then
      raise exception 'Konten tidak ditemukan' using errcode = 'P0002';
    end if;
  end if;
  return jsonb_build_object('id', v_id);
end;
$$;

create or replace function public.ig_cp_delete(p_ids uuid[])
returns jsonb
language sql
security definer
set search_path = ''
as $$
  with d as (delete from ig.content_plan where id = any(p_ids) returning 1)
  select jsonb_build_object('deleted', (select count(*) from d))
$$;

create or replace function public.ig_cp_set_status(p_ids uuid[], p_status text)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  with u as (update ig.content_plan set status = p_status where id = any(p_ids) returning 1)
  select jsonb_build_object('updated', (select count(*) from u))
$$;

-- Satu tahap produksi (klik di tabel). Nama tahap divalidasi di sini karena
-- dipetakan ke kolom yang berbeda.
create or replace function public.ig_cp_set_stage(p_id uuid, p_stage text, p_value text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n int;
begin
  if p_stage not in ('script', 'editing', 'review', 'upload') then
    raise exception 'Tahap tidak dikenal' using errcode = '22023';
  end if;
  update ig.content_plan set
    stage_script = case when p_stage = 'script' then p_value else stage_script end,
    stage_editing = case when p_stage = 'editing' then p_value else stage_editing end,
    stage_review = case when p_stage = 'review' then p_value else stage_review end,
    stage_upload = case when p_stage = 'upload' then p_value else stage_upload end
  where id = p_id;
  get diagnostics v_n = row_count;
  return jsonb_build_object('updated', v_n);
end;
$$;

-- ---------------------------------------------------------------------------
-- Kartu "Rencana terdekat" di Ringkasan: konten yang belum published, yang
-- lewat tanggal lebih dulu (perlu perhatian), lalu yang terdekat.
-- ---------------------------------------------------------------------------
create or replace function public.ig_cp_upcoming(p_limit int default 5)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with today as (
    select (now() at time zone 'Asia/Jakarta')::date as d
  ),
  open_items as (
    select c.*, c.planned_on < (select d from today) as overdue
    from ig.content_plan c
    where c.status <> 'published'
  )
  select jsonb_build_object(
    'today', (select d from today),
    'open_total', (select count(*) from open_items),
    'overdue_total', (select count(*) from open_items where overdue),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id, 'planned_on', o.planned_on, 'title', o.title, 'pillar', o.pillar,
        'format', o.format, 'status', o.status, 'pic', o.pic, 'overdue', o.overdue
      ) order by o.planned_on, o.created_at)
      from (
        select * from open_items
        order by planned_on, created_at
        limit least(greatest(coalesce(p_limit, 5), 1), 20)
      ) o
    ), '[]'::jsonb)
  )
$$;

-- ---------------------------------------------------------------------------
-- Calon post Instagram untuk ditautkan ke satu rencana: post yang terbit
-- dalam +/- p_days hari dari tanggal tayang, terdekat lebih dulu. Rubrik
-- dideteksi dari hashtag di caption supaya isian bisa disarankan otomatis.
-- ---------------------------------------------------------------------------
create or replace function public.ig_cp_post_candidates(p_date date, p_days int default 7)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with rubrik(slug) as (
    values ('lifeasnusantaraentreplanters'), ('oneweekonetips'), ('respectfulinclusiveworkplace'), ('tumbuhdiptpn'),
           ('ceritainovator'), ('levelupchangeagent'), ('motivasientreplanters'), ('sipalingculture')
  ),
  win as (
    select least(greatest(coalesce(p_days, 7), 0), 31) as d
  )
  select coalesce(jsonb_agg(to_jsonb(x) order by x.days_off, x.posted_at desc), '[]'::jsonb)
  from (
    select
      m.id,
      m.content_kind,
      left(m.caption, 140) as caption,
      m.permalink,
      coalesce(m.image_url, m.thumbnail_url, m.media_url) as thumb_url,
      m.posted_at,
      abs((m.posted_at at time zone 'Asia/Jakarta')::date - p_date) as days_off,
      (select r.slug from rubrik r where m.caption ilike '%#' || r.slug || '%' limit 1) as rubrik,
      (select c.id from ig.content_plan c where c.media_id = m.id) as linked_plan_id
    from ig.media m
    where (m.posted_at at time zone 'Asia/Jakarta')::date
          between p_date - (select d from win) and p_date + (select d from win)
    order by days_off, m.posted_at desc
    limit 30
  ) x
$$;

revoke all on function public.ig_cp_list(date, date, text, text, text, text, text, int) from public, anon, authenticated;
revoke all on function public.ig_cp_upsert(uuid, date, text, text, text, text, text, text, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.ig_cp_delete(uuid[]) from public, anon, authenticated;
revoke all on function public.ig_cp_set_status(uuid[], text) from public, anon, authenticated;
revoke all on function public.ig_cp_set_stage(uuid, text, text) from public, anon, authenticated;
revoke all on function public.ig_cp_upcoming(int) from public, anon, authenticated;
revoke all on function public.ig_cp_post_candidates(date, int) from public, anon, authenticated;
grant execute on function public.ig_cp_list(date, date, text, text, text, text, text, int) to service_role;
grant execute on function public.ig_cp_upsert(uuid, date, text, text, text, text, text, text, text, text, text, text, text, text, text) to service_role;
grant execute on function public.ig_cp_delete(uuid[]) to service_role;
grant execute on function public.ig_cp_set_status(uuid[], text) to service_role;
grant execute on function public.ig_cp_set_stage(uuid, text, text) to service_role;
grant execute on function public.ig_cp_upcoming(int) to service_role;
grant execute on function public.ig_cp_post_candidates(date, int) to service_role;

-- Dibuat oleh Faiz Hazim Hawari · skill-analysis
