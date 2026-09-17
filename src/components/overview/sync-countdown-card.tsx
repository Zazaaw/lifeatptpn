"use client";

import { useEffect, useState } from "react";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react";

import { fmtDateTime } from "@/lib/format";

/** pg_cron `ig-sync-hourly` berjalan tiap jam pada menit ke-7 (lihat migrasi ig_cron). */
const SYNC_MINUTE = 7;

function nextSync(now: number) {
  const d = new Date(now);
  d.setUTCSeconds(0, 0);
  d.setUTCMinutes(SYNC_MINUTE);
  if (d.getTime() <= now) d.setUTCHours(d.getUTCHours() + 1);
  return d.getTime();
}

/**
 * Hitung mundur ke sinkron berikutnya (arah desain "Time tracker" referensi).
 * Nilainya nyata: jadwal cron + waktu sinkron sukses terakhir dari database.
 * Detik diperbarui sekali per detik, bukan per frame.
 */
export function SyncCountdownCard({ lastSuccess }: { lastSuccess: string | null }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const target = now !== null ? nextSync(now) : null;
  const remaining = now !== null && target !== null ? Math.max(0, target - now) : null;
  const progress = remaining !== null ? 1 - remaining / 3_600_000 : 0;
  const mm = remaining !== null ? String(Math.floor(remaining / 60000)).padStart(2, "0") : "--";
  const ss = remaining !== null ? String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0") : "--";

  const r = 58;
  const circ = 2 * Math.PI * r;

  return (
    <div className="flex min-h-72 flex-col rounded-card border border-border/70 bg-card/85 p-5 shadow-[0_24px_48px_-36px_hsl(var(--foreground)/0.35)]">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lead font-bold tracking-tight">Sinkron berikutnya</h2>
        <span className="inline-flex size-10 items-center justify-center rounded-full border border-border/70 bg-card" aria-hidden>
          <ArrowsClockwiseIcon className="size-4" />
        </span>
      </div>
      <div className="relative mx-auto my-4 size-40">
        <svg viewBox="0 0 140 140" className="size-full -rotate-90" aria-hidden>
          <circle cx="70" cy="70" r={r} fill="none" stroke="hsl(var(--muted-foreground) / 0.25)" strokeWidth="2" strokeDasharray="1 5.1" />
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke="hsl(var(--brand-orange))"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - progress)}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear motion-reduce:transition-none"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-h4 font-bold tabular-nums" role="timer" aria-live="off">
            {mm}:{ss}
          </p>
          <p className="text-caption text-muted-foreground">menit lagi</p>
        </div>
      </div>
      <p className="mt-auto text-caption text-muted-foreground">
        Terakhir sukses {fmtDateTime(lastSuccess)}. Jadwal: tiap jam menit ke-{SYNC_MINUTE}.
      </p>
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
