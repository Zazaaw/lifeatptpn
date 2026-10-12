"use client";

import type { Icon } from "@phosphor-icons/react";
import { CardsIcon, ClockIcon, FilmSlateIcon, ImageIcon, VideoCameraIcon, WarningIcon } from "@phosphor-icons/react";

import {
  FORMAT_LABEL,
  PILLAR_LABEL,
  PILLAR_STYLE,
  STATUS_LABEL,
  STATUS_STYLE,
  type Format,
  type Pillar,
  type Status,
} from "@/lib/content-plan";
import { cn } from "@/lib/utils";

export const FORMAT_ICON: Record<Format, Icon> = {
  reels: FilmSlateIcon,
  carousel: CardsIcon,
  poster: ImageIcon,
  story: ClockIcon, // story hidup 24 jam
  video: VideoCameraIcon,
};

/** Nama pilar SELALU tampil sebagai teks; warna hanya penanda tambahan. */
export function PillarChip({ pillar, className }: { pillar: Pillar; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full border px-2.5 py-0.5 text-caption leading-tight font-semibold text-foreground",
        PILLAR_STYLE[pillar].chip,
        className
      )}
    >
      {PILLAR_LABEL[pillar]}
    </span>
  );
}

export function StatusBadge({ status, overdue }: { status: Status; overdue?: boolean }) {
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-semibold", STATUS_STYLE[status])}>
        {STATUS_LABEL[status]}
      </span>
      {overdue ? (
        <span className="inline-flex items-center gap-1 text-caption font-semibold text-destructive">
          <WarningIcon className="size-3.5" weight="bold" aria-hidden />
          Lewat tanggal
        </span>
      ) : null}
    </span>
  );
}

export function FormatLabel({ format }: { format: Format }) {
  const FIcon = FORMAT_ICON[format];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <FIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      {FORMAT_LABEL[format]}
    </span>
  );
}

/** Inisial dari nama PIC (maks 2 huruf). Bukan foto palsu: tim tidak menyimpan foto. */
export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const two = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
  return two.toUpperCase();
}

export function PicLabel({ name }: { name: string | null }) {
  if (!name) return <span className="text-caption text-muted-foreground">Belum ada PIC</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-green-soft text-caption font-bold text-brand-green-strong"
        aria-hidden
      >
        {initials(name)}
      </span>
      <span className="min-w-0 break-words">{name}</span>
    </span>
  );
}

const DAY = new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", day: "numeric", month: "short" });
const WEEKDAY = new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", weekday: "short" });
const FULL = new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" });

/** Tanggal tayang (string YYYY-MM-DD, sudah tanggal WIB) tanpa ikut zona perangkat. */
export function PlanDate({ ymd, overdue }: { ymd: string; overdue?: boolean }) {
  const d = new Date(`${ymd}T00:00:00Z`);
  return (
    <time dateTime={ymd} title={FULL.format(d)} className="flex flex-col leading-tight">
      <span className={cn("font-semibold whitespace-nowrap tabular-nums", overdue && "text-destructive")}>{DAY.format(d)}</span>
      <span className="text-caption text-muted-foreground">{WEEKDAY.format(d)}</span>
    </time>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
