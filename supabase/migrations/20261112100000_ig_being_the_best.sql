-- ============================================================================
-- Being the Best (timeline program budaya Above & Below the Line)
-- ----------------------------------------------------------------------------
-- 12 Nov 2026, permintaan user: halaman /being-the-best dari file xlsx tim,
-- lalu "pastiin bisa diedit, PIN-nya sama" dengan Content Plan.
--
-- Data awal diisi oleh migrasi seed 20261112100100_ig_being_the_best_seed.sql
-- yang di-generate dari data/timeline-being-the-best.xlsx (npm run import:btb).
-- Setelah itu database yang menjadi sumber; perubahan dari web tidak ditimpa
-- seed karena seed memakai `on conflict do nothing`.
--
-- Urutan baris mengikuti kode seperti di file (A1 < A2 < A10, A3.1 < A3.1.2),
-- jadi tidak ada kolom urutan terpisah. Judul kelompok (A3.1, A4.2, ...) adalah
-- item tanpa tanggal; aktivitas di bawahnya dikenali dari awalan kodenya.
--
-- Aksi tulis dijaga PIN yang sama dengan Content Plan (PLAN_EDIT_PIN, cookie
-- rencana_edit) di server action, dan hanya lewat function service_role.
-- Schema ig tidak diekspos ke anon. Status yang boleh juga ada di
-- src/lib/being-the-best.ts (BTB_STATUSES): ubah keduanya bersamaan.
-- ============================================================================

create table if not exists ig.btb_programs (
  code        text primary key,                 -- A1, B2, ...
  section     text not null,                    -- above / below
  name        text not null,
  due_week    date,                             -- Senin minggu due (label W3 Nov '26 dihitung dari tanggal ini)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint btb_programs_code_fmt check (code ~ '^[A-Z][0-9]{1,3}$'),
  constraint btb_programs_section_valid check (section in ('above', 'below')),
  constraint btb_programs_name_len check (char_length(btrim(name)) between 1 and 200),
  constraint btb_programs_due_monday check (due_week is null or extract(isodow from due_week) = 1)
);

create table if not exists ig.btb_items (
  id            uuid primary key default gen_random_uuid(),
  program_code  text not null references ig.btb_programs(code) on delete cascade,
  kind          text not null,                  -- activity / group
  code          text not null,
  name          text not null,
  status        text,
  pic           text,
  start_date    date,
  end_date      date,
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint btb_items_code_uniq unique (code),
  constraint btb_items_kind_valid check (kind in ('activity', 'group')),
  constraint btb_items_code_fmt check (code ~ '^[A-Z][0-9]{1,3}(\.[0-9]{1,3}){1,4}$'),
  constraint btb_items_code_in_program check (split_part(code, '.', 1) = program_code),
  constraint btb_items_name_len check (char_length(btrim(name)) between 1 and 300),
  constraint btb_items_status_valid check (status is null or status in ('Not Started', 'On Progress', 'Done')),
  constraint btb_items_pic_len check (pic is null or char_length(pic) <= 60),
  constraint btb_items_note_len check (note is null or char_length(note) <= 1000),
  constraint btb_items_dates check (
    (kind = 'group' and start_date is null and end_date is null and status is null and pic is null)
    or (kind = 'activity' and start_date is not null and end_date is not null and end_date >= start_date)
  )
);
create index if not exists btb_items_program_idx on ig.btb_items (program_code);

create table if not exists ig.btb_notes (
  id    int generated always as identity primary key,
  sort  int not null,
  body  text not null,
  constraint btb_notes_body_len check (char_length(btrim(body)) between 1 and 2000)
);

alter table ig.btb_programs enable row level security;
alter table ig.btb_items enable row level security;
alter table ig.btb_notes enable row level security;
grant select, insert, update, delete on ig.btb_programs, ig.btb_items, ig.btb_notes to service_role;

drop trigger if exists btb_programs_touch on ig.btb_programs;
create trigger btb_programs_touch before update on ig.btb_programs
for each row execute function ig.plan_touch_updated_at();
drop trigger if exists btb_items_touch on ig.btb_items;
create trigger btb_items_touch before update on ig.btb_items
for each row execute function ig.plan_touch_updated_at();

-- ---------------------------------------------------------------------------
-- Baca semuanya sekaligus (±70 baris): program berurutan per bagian dan kode,
-- item di dalamnya berurutan per kode numerik, plus catatan dan waktu ubah terakhir.
-- ---------------------------------------------------------------------------
create or replace function public.ig_btb_list()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'today', (now() at time zone 'Asia/Jakarta')::date,
    'updated_at', greatest(
      (select max(updated_at) from ig.btb_programs),
      (select max(updated_at) from ig.btb_items)
    ),
    'programs', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'code', p.code,
          'section', p.section,
          'name', p.name,
          'due_week', p.due_week,
          'items', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', i.id,
                'kind', i.kind,
                'code', i.code,
                'name', i.name,
                'status', i.status,
                'pic', i.pic,
                'start', i.start_date,
                'end', i.end_date,
                'note', i.note
              )
              order by string_to_array(substr(i.code, 2), '.')::int[]
            )
            from ig.btb_items i
            where i.program_code = p.code
          ), '[]'::jsonb)
        )
        order by case p.section when 'above' then 0 else 1 end, left(p.code, 1), substr(p.code, 2)::int
      )
      from ig.btb_programs p
    ), '[]'::jsonb),
    'notes', coalesce((select jsonb_agg(n.body order by n.sort, n.id) from ig.btb_notes n), '[]'::jsonb)
  )
$$;

-- ---------------------------------------------------------------------------
-- Program: p_is_new = true menambah (kode tidak boleh dipakai), false mengubah
-- nama/bagian/due. Kode program tidak bisa diubah setelah dibuat karena semua
-- kode aktivitas di bawahnya berawalan kode itu.
-- ---------------------------------------------------------------------------
create or replace function public.ig_btb_save_program(
  p_code text,
  p_is_new boolean,
  p_section text,
  p_name text,
  p_due_week date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n int;
begin
  if p_is_new then
    insert into ig.btb_programs (code, section, name, due_week)
    values (upper(btrim(p_code)), p_section, btrim(p_name), p_due_week);
  else
    update ig.btb_programs
    set section = p_section, name = btrim(p_name), due_week = p_due_week
    where code = p_code;
    get diagnostics v_n = row_count;
    if v_n = 0 then
      raise exception 'Program tidak ditemukan' using errcode = 'P0002';
    end if;
  end if;
  return jsonb_build_object('code', upper(btrim(p_code)));
end;
$$;

create or replace function public.ig_btb_delete_program(p_code text)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  with items as (select count(*) as n from ig.btb_items where program_code = p_code),
  d as (delete from ig.btb_programs where code = p_code returning 1)
  select jsonb_build_object('deleted', (select count(*) from d), 'items', (select n from items))
$$;

-- ---------------------------------------------------------------------------
-- Aktivitas / judul kelompok: p_id null = tambah. Program diambil dari awalan
-- kode, jadi kode dan program tidak mungkin saling bertentangan.
-- ---------------------------------------------------------------------------
create or replace function public.ig_btb_save_item(
  p_id uuid,
  p_kind text,
  p_code text,
  p_name text,
  p_status text,
  p_pic text,
  p_start date,
  p_end date,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_code text := upper(btrim(p_code));
  v_group boolean := p_kind = 'group';
begin
  if not exists (select 1 from ig.btb_programs where code = split_part(v_code, '.', 1)) then
    raise exception 'Program % belum ada', split_part(v_code, '.', 1) using errcode = 'P0002';
  end if;
  if p_id is null then
    insert into ig.btb_items (program_code, kind, code, name, status, pic, start_date, end_date, note)
    values (
      split_part(v_code, '.', 1), p_kind, v_code, btrim(p_name),
      case when v_group then null else nullif(btrim(p_status), '') end,
      case when v_group then null else nullif(btrim(p_pic), '') end,
      case when v_group then null else p_start end,
      case when v_group then null else p_end end,
      nullif(btrim(p_note), '')
    )
    returning id into v_id;
  else
    update ig.btb_items set
      program_code = split_part(v_code, '.', 1),
      code = v_code,
      name = btrim(p_name),
      status = case when kind = 'group' then null else nullif(btrim(p_status), '') end,
      pic = case when kind = 'group' then null else nullif(btrim(p_pic), '') end,
      start_date = case when kind = 'group' then null else p_start end,
      end_date = case when kind = 'group' then null else p_end end,
      note = nullif(btrim(p_note), '')
    where id = p_id
    returning id into v_id;
    if v_id is null then
      raise exception 'Aktivitas tidak ditemukan' using errcode = 'P0002';
    end if;
  end if;
  return jsonb_build_object('id', v_id);
end;
$$;

create or replace function public.ig_btb_delete_item(p_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  with d as (delete from ig.btb_items where id = p_id returning 1)
  select jsonb_build_object('deleted', (select count(*) from d))
$$;

revoke all on function public.ig_btb_list() from public, anon, authenticated;
revoke all on function public.ig_btb_save_program(text, boolean, text, text, date) from public, anon, authenticated;
revoke all on function public.ig_btb_delete_program(text) from public, anon, authenticated;
revoke all on function public.ig_btb_save_item(uuid, text, text, text, text, text, date, date, text) from public, anon, authenticated;
revoke all on function public.ig_btb_delete_item(uuid) from public, anon, authenticated;
grant execute on function public.ig_btb_list() to service_role;
grant execute on function public.ig_btb_save_program(text, boolean, text, text, date) to service_role;
grant execute on function public.ig_btb_delete_program(text) to service_role;
grant execute on function public.ig_btb_save_item(uuid, text, text, text, text, text, date, date, text) to service_role;
grant execute on function public.ig_btb_delete_item(uuid) to service_role;

-- Dibuat oleh Faiz Hazim Hawari · skill-analysis
