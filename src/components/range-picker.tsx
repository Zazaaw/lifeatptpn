"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarBlankIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { addDays, diffDays, MAX_RANGE_DAYS, todayWib } from "@/lib/range";

type Preset = { key: string; label: string; range: () => { from: string; to: string } };

function monthStart(ymd: string) {
  return `${ymd.slice(0, 7)}-01`;
}

/**
 * Pemilih rentang tanggal. Preset dihitung dalam WIB dan berakhir KEMARIN,
 * karena hari berjalan belum lengkap. "Bulan ini" berakhir kemarin juga.
 * Perubahan ditulis ke URL (from/to) sehingga tautan bisa dibagikan dan
 * halaman server membaca rentang yang sama.
 */
export function RangePicker({
  from,
  to,
  presetDays = [7, 28, 90],
  className,
}: {
  from: string;
  to: string;
  presetDays?: number[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [customOpen, setCustomOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);
  const [error, setError] = useState<string | null>(null);

  const today = todayWib();
  const yesterday = addDays(today, -1);

  const presets: Preset[] = [
    ...presetDays.map((d) => ({
      key: `${d}d`,
      label: d >= 365 ? "12 bulan" : `${d} hari`,
      range: () => ({ from: addDays(yesterday, -(d - 1)), to: yesterday }),
    })),
    {
      key: "this-month",
      label: "Bulan ini",
      range: () => ({ from: monthStart(yesterday), to: yesterday }),
    },
    {
      key: "last-month",
      label: "Bulan lalu",
      range: () => {
        const end = addDays(monthStart(today), -1);
        return { from: monthStart(end), to: end };
      },
    },
  ];

  const activeKey = presets.find((p) => {
    const r = p.range();
    return r.from === from && r.to === to;
  })?.key;

  function apply(next: { from: string; to: string }) {
    const q = new URLSearchParams(params.toString());
    q.set("from", next.from);
    q.set("to", next.to);
    q.delete("page"); // rentang berubah → kembali ke halaman 1
    startTransition(() => router.push(`${pathname}?${q.toString()}`, { scroll: false }));
  }

  function applyCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!draftFrom || !draftTo) return setError("Isi tanggal mulai dan tanggal akhir.");
    if (draftTo < draftFrom) return setError("Tanggal akhir tidak boleh lebih awal dari tanggal mulai.");
    if (diffDays(draftFrom, draftTo) > MAX_RANGE_DAYS) return setError(`Rentang maksimal ${MAX_RANGE_DAYS} hari.`);
    setError(null);
    setCustomOpen(false);
    apply({ from: draftFrom, to: draftTo });
  }

  return (
    <div className={cn("no-print flex flex-col gap-3", className)} aria-busy={pending}>
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="group"
          aria-label="Pilih rentang tanggal"
          className="relative flex w-full items-center overflow-x-auto rounded-full border border-border/70 bg-card/85 p-1 shadow-sm md:w-fit [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {presets.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-pressed={activeKey === p.key}
              disabled={pending}
              onClick={() => apply(p.range())}
              className={cn(
                "whitespace-nowrap rounded-full px-4 py-1.5 text-body-sm font-medium transition-colors outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60",
                activeKey === p.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            aria-expanded={customOpen}
            aria-pressed={!activeKey}
            onClick={() => setCustomOpen((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-body-sm font-medium transition-colors outline-hidden focus-visible:ring-1 focus-visible:ring-ring",
              !activeKey ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarBlankIcon className="size-4" aria-hidden />
            Pilih tanggal
          </button>
        </div>
        {pending ? (
          <span className="text-caption text-muted-foreground" role="status">
            Memuat data…
          </span>
        ) : null}
      </div>

      {customOpen ? (
        <form onSubmit={applyCustom} className="flex flex-wrap items-end gap-3 rounded-tile border border-border/70 bg-card/90 p-4 shadow-sm">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="range-from" className="text-body-sm font-medium">
              Tanggal mulai
            </label>
            <Input
              id="range-from"
              type="date"
              value={draftFrom}
              max={today}
              onChange={(e) => setDraftFrom(e.target.value)}
              className="w-44"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="range-to" className="text-body-sm font-medium">
              Tanggal akhir
            </label>
            <Input
              id="range-to"
              type="date"
              value={draftTo}
              max={today}
              onChange={(e) => setDraftTo(e.target.value)}
              className="w-44"
            />
          </div>
          <Button type="submit" disabled={pending}>
            Terapkan
          </Button>
          {error ? (
            <p className="w-full text-body-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
