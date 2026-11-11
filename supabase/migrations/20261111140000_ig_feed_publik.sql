-- ============================================================================
-- Feed publik untuk AGHRIS (11 Nov 2026).
--
-- AGHRIS (aghris.ptpn.id) menampilkan galeri @lifeatptpn di halaman
-- /life-at-ptpn dan panel Beranda. Sebelumnya isinya snapshot manual (ekspor
-- 12 Okt 2026 + unggah WebP), jadi postingan baru tidak pernah muncul sendiri.
-- Sekarang AGHRIS membaca langsung dari sini lewat RPC publik di bawah.
--
-- 1. Slide carousel: ig.media hanya menyimpan sampul. Langkah `slides` di
--    ig-sync mengambil /{id}/children lalu mencermin tiap slide ke bucket
--    ig-thumbs (<id>_01.jpg, _02.jpg, …). Hasilnya di kolom `slides`.
-- 2. Ukuran gambar (image_w/image_h, dan w/h per slide) supaya galeri bisa
--    menampilkan foto utuh sesuai rasio aslinya tanpa mengunduhnya dulu.
--    0 = ukuran tidak terbaca (dicatat supaya tidak dicoba tiap jam).
-- 3. public.ig_feed_publik: hanya postingan FEED/REELS (tanpa Story), hanya
--    kolom yang memang sudah publik di Instagram (caption, tautan, foto).
--    Tanpa angka insight, komentar, atau data akun. Boleh dipanggil anon
--    karena isinya sama persis dengan yang tampil di profil Instagram publik.
-- ============================================================================

alter table ig.media
  add column if not exists image_w             integer,
  add column if not exists image_h             integer,
  add column if not exists slides              jsonb,        -- [{url, w, h}] urut slide, hasil cermin
  add column if not exists slides_synced_at    timestamptz,
  add column if not exists slides_attempted_at timestamptz,
  add column if not exists slides_error        text;

comment on column ig.media.slides is 'Slide carousel yang sudah dicermin ke ig-thumbs: [{url, w, h}] sesuai urutan di Instagram. NULL = belum dicermin / bukan carousel.';
comment on column ig.media.image_w is 'Lebar gambar sampul (px) hasil cermin. 0 = tidak terbaca.';

-- Kandidat cermin slide & ukuran: partial index supaya pemilihan kandidat tetap murah.
create index if not exists media_slides_pending_idx on ig.media (posted_at desc)
  where media_type = 'CAROUSEL_ALBUM' and slides is null;
create index if not exists media_size_pending_idx on ig.media (posted_at desc)
  where image_url is not null and image_w is null;

create or replace function public.ig_feed_publik(p_limit integer default 500)
returns table (
  id text,
  jenis text,
  posted_at timestamptz,
  permalink text,
  caption text,
  cover text,
  cover_w integer,
  cover_h integer,
  slides jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    m.id,
    case
      when m.media_type = 'CAROUSEL_ALBUM' then 'Carousel'
      when m.media_type = 'VIDEO' then 'Reels'
      else 'Foto'
    end,
    m.posted_at,
    m.permalink,
    m.caption,
    m.image_url,
    m.image_w,
    m.image_h,
    m.slides
  from ig.media m
  where m.media_product_type is distinct from 'STORY'
    and m.image_url is not null
  order by m.posted_at desc
  limit least(greatest(coalesce(p_limit, 500), 1), 1000);
$$;

comment on function public.ig_feed_publik(integer) is 'Feed @lifeatptpn untuk AGHRIS: hanya konten yang sudah publik di Instagram (tanpa insight/komentar/Story). Dipanggil dengan publishable key.';

revoke all on function public.ig_feed_publik(integer) from public;
grant execute on function public.ig_feed_publik(integer) to anon, authenticated, service_role;
