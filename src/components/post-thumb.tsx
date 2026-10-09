"use client";

import { useState } from "react";
import { ImageBrokenIcon } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

/**
 * Thumbnail post. Sumbernya didahulukan dari salinan permanen di Supabase
 * Storage (bucket ig-thumbs, diisi langkah `images` di ig-sync); URL CDN Meta
 * hanya cadangan untuk post yang belum selesai dicermin, dan URL itu memang
 * kedaluwarsa beberapa hari. Jadi gambar gagal dimuat masih mungkin terjadi:
 * tampilkan placeholder yang jelas, bukan ikon gambar rusak bawaan browser.
 */
export function PostThumb({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className={cn("flex items-center justify-center rounded-md bg-muted text-muted-foreground", className)}
        role="img"
        aria-label={`${alt} (gambar tidak tersedia)`}
      >
        <ImageBrokenIcon className="size-5" aria-hidden />
      </div>
    );
  }
  return (
    // next/image tidak dipakai: sumbernya bisa salinan Storage atau URL CDN Meta
    // yang berumur pendek, jadi optimisasi server berisiko meng-cache gambar
    // yang sebentar lagi mati. Ukuran thumbnail sudah kecil dari sumbernya.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn("rounded-md bg-muted object-cover", className)}
    />
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
