-- ============================================================================
-- Jadwal sync lifeatptpn-insight (pg_cron + pg_net)
-- ----------------------------------------------------------------------------
-- Extension pg_cron & pg_net diaktifkan di project maganghub-seleksi (dipakai
-- bersama; tidak mengubah apa pun milik maganghub).
-- URL function dan secret dibaca dari Vault saat job jalan, jadi tidak ada
-- rahasia yang tertulis di definisi cron.
-- ============================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- URL project disimpan di Vault supaya fungsi di bawah tidak hardcode host.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'ig_project_url') then
    perform vault.create_secret('https://veibueqoxqoyamhqdwma.supabase.co', 'ig_project_url', 'URL project untuk memanggil edge function ig-sync');
  end if;
end $$;

create or replace function ig.trigger_sync(p_mode text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url    text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'ig_project_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'ig_sync_secret';
  if v_url is null or v_secret is null then
    raise exception 'Vault ig_project_url / ig_sync_secret belum diisi';
  end if;
  return net.http_post(
    url := v_url || '/functions/v1/ig-sync?mode=' || p_mode,
    headers := jsonb_build_object('content-type', 'application/json', 'x-sync-secret', v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  );
end $$;
revoke all on function ig.trigger_sync(text) from public, anon, authenticated;

-- Tiap jam menit ke-7: post, story, metrik harian akun.
select cron.schedule('ig-sync-hourly', '7 * * * *', $$select ig.trigger_sync('hourly')$$);
-- Tiap hari 00:20 UTC = 07:20 WIB (setelah hari Meta sebelumnya tutup 14:00/15:00 WIB):
-- demografi, jam online follower, follower baru, refresh token.
select cron.schedule('ig-sync-daily', '20 0 * * *', $$select ig.trigger_sync('daily')$$);

-- Dibuat oleh Faiz Hazim Hawari · skill-analysis
