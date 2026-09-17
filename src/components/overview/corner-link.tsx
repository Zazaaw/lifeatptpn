import Link from "next/link";
import { ArrowUpRightIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";

/** Tombol bulat panah di pojok kartu (arah desain referensi) menuju halaman detail. */
export function CornerLink({ href, label, tone = "default" }: { href: string; label: string; tone?: "default" | "ink" }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full border transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
        tone === "ink"
          ? "border-white/15 bg-white/10 text-ink-foreground hover:bg-white/20"
          : "border-border/70 bg-card hover:bg-accent"
      )}
    >
      <ArrowUpRightIcon className="size-4" aria-hidden />
    </Link>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
