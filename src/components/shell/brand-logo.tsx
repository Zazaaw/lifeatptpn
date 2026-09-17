import Image from "next/image";

import { cn } from "@/lib/utils";

type Tone = "auto" | "onDark";

/**
 * Logo resmi dari aset maganghub (public/brand).
 * - tone "auto": warna di mode terang, putih di mode gelap.
 * - tone "onDark": selalu putih (untuk kartu gelap), kembali berwarna saat dicetak
 *   karena latar gelap tidak ikut tercetak.
 * Nama logo dibacakan dari pembungkus (role="img"), karena salah satu gambar selalu tersembunyi.
 */
function classes(tone: Tone) {
  return tone === "onDark"
    ? { color: "hidden object-contain print:block", white: "object-contain print:hidden" }
    : { color: "object-contain dark:hidden", white: "hidden object-contain dark:block" };
}

export function LifeAtPtpnLogo({ className, priority, tone = "auto" }: { className?: string; priority?: boolean; tone?: Tone }) {
  const c = classes(tone);
  return (
    <span role="img" aria-label="Life at PTPN" className={cn("relative inline-block aspect-[900/652]", className)}>
      <Image src="/brand/life-at-ptpn.png" alt="" aria-hidden fill sizes="160px" priority={priority} className={c.color} />
      <Image src="/brand/life-at-ptpn-white.png" alt="" aria-hidden fill sizes="160px" priority={priority} className={c.white} />
    </span>
  );
}

export function PtpnLogo({ className, tone = "auto" }: { className?: string; tone?: Tone }) {
  const c = classes(tone);
  return (
    <span role="img" aria-label="PT Perkebunan Nusantara" className={cn("relative inline-block aspect-[2959/1466]", className)}>
      <Image src="/brand/ptpn3-logo.png" alt="" aria-hidden fill sizes="120px" className={c.color} />
      <Image src="/brand/ptpn3-logo-white.png" alt="" aria-hidden fill sizes="120px" className={c.white} />
    </span>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
