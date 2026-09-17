import { ArrowDownIcon, ArrowUpIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";
import { fmtSignedPct, isNum, pctChange } from "@/lib/format";

/**
 * Perubahan vs periode pembanding. Arah dibaca dari ikon + tanda + kata,
 * bukan warna saja (skill-analysis §9.5, dataviz status rule).
 */
export function Delta({
  current,
  previous,
  upIsGood = true,
  className,
}: {
  current: number | null | undefined;
  previous: number | null | undefined;
  upIsGood?: boolean;
  className?: string;
}) {
  const change = pctChange(current, previous);
  if (!isNum(change)) {
    return <span className={cn("text-caption text-muted-foreground", className)}>Tidak ada pembanding</span>;
  }
  const label = fmtSignedPct(change);
  if (Math.abs(change) < 0.0005) {
    return <span className={cn("text-caption text-muted-foreground tabular-nums", className)}>Stabil ({label})</span>;
  }
  const up = change > 0;
  const good = up === upIsGood;
  const Icon = up ? ArrowUpIcon : ArrowDownIcon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-caption font-medium tabular-nums",
        good ? "text-delta-up" : "text-delta-down",
        className
      )}
    >
      <Icon className="size-3.5" weight="bold" aria-hidden />
      {label}
      <span className="sr-only">{up ? "naik" : "turun"} dibanding periode sebelumnya</span>
    </span>
  );
}

/**
 * Stat tile: label · nilai · delta · catatan. Nilai memakai tabular-nums
 * (skill-typography §17.1; aturan skill project menang atas saran dataviz).
 */
export function StatTile({
  label,
  value,
  current,
  previous,
  upIsGood,
  note,
  className,
}: {
  label: string;
  value: string;
  current?: number | null;
  previous?: number | null;
  upIsGood?: boolean;
  note?: React.ReactNode;
  className?: string;
}) {
  const showDelta = current !== undefined;
  return (
    <div className={cn("print-break-avoid flex flex-col gap-2 rounded-card border border-border/70 bg-card/85 p-5 shadow-[0_24px_48px_-36px_hsl(var(--foreground)/0.35)]", className)}>
      <p className="text-caption font-medium text-muted-foreground">{label}</p>
      <p className="text-h4 font-bold tabular-nums md:text-kpi">{value}</p>
      <div className="flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1">
        {showDelta ? <Delta current={current} previous={previous} upIsGood={upIsGood} /> : null}
        {note ? <span className="text-caption text-muted-foreground">{note}</span> : null}
      </div>
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-typography
