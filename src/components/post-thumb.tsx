"use client";

import { useState } from "react";
import { ImageBrokenIcon } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

/**
 * Thumbnail post dari CDN Instagram. URL CDN Meta kedaluwarsa beberapa hari
 * dan baru diperbarui saat sync berikutnya, jadi gambar gagal dimuat itu
 * wajar: tampilkan placeholder yang jelas, bukan ikon gambar rusak bawaan browser.
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
    // next/image tidak dipakai: URL CDN Meta bertanda tangan & berumur pendek,
    // optimisasi server hanya akan meng-cache gambar yang sebentar lagi mati.
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
