import Image from "next/image";
import { InstagramLogoIcon } from "@phosphor-icons/react/ssr";

import { fmtCompact } from "@/lib/format";

/**
 * Kartu identitas akun dengan foto resmi PTPN (aset maganghub). Angka follower
 * dari sinkron terakhir; tombol membuka profil Instagram asli.
 */
export function PhotoCard({
  username,
  name,
  followers,
}: {
  username: string;
  name: string | null;
  followers: number | null;
}) {
  return (
    <div className="relative isolate flex min-h-72 flex-col justify-end overflow-hidden rounded-card border border-border/70 p-5 text-white shadow-[0_24px_48px_-36px_hsl(var(--foreground)/0.35)]">
      <Image
        src="/brand/foto-2.jpg"
        alt="Karyawati PTPN berseragam kerja di area pabrik"
        fill
        sizes="(min-width: 1280px) 22vw, (min-width: 768px) 45vw, 100vw"
        className="-z-10 object-cover object-[50%_25%]"
        priority
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0f1a12]/85 via-[#0f1a12]/25 to-transparent" aria-hidden />
      <p className="text-h5 font-bold leading-tight tracking-tight">@{username}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="line-clamp-2 max-w-[22ch] text-body-sm text-white/85">{name ?? "Life at PTPN"}</p>
        <a
          href={`https://www.instagram.com/${username}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-white/40 bg-white/15 px-4 text-body-sm font-medium backdrop-blur-sm transition-colors hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white outline-hidden"
        >
          <InstagramLogoIcon className="size-4" aria-hidden />
          {followers !== null ? `${fmtCompact(followers)} follower` : "Buka profil"}
          <span className="sr-only">(buka Instagram di tab baru)</span>
        </a>
      </div>
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
