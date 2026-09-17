import Link from "next/link";

import { cn } from "@/lib/utils";
import { fmtCompact, fmtYmd } from "@/lib/format";
import { KIND_LABEL, KIND_SWATCH } from "@/lib/kinds";
import { addDays } from "@/lib/range";
import type { PostCalendar } from "@/lib/data";

const DAY_ABBR = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

/** Pita waktu WIB. Post diletakkan pada pita sesuai jam terbitnya. */
const BANDS = [
  { label: "Dini hari", from: 0, to: 5 },
  { label: "Pagi", from: 5, to: 11 },
  { label: "Siang", from: 11, to: 15 },
  { label: "Sore", from: 15, to: 18 },
  { label: "Malam", from: 18, to: 24 },
];

/**
 * Kalender posting 7 hari (arah desain kalender referensi): kolom hari, baris
 * pita waktu, kartu kecil per post. Setiap kartu menuju detail post.
 */
export function PostCalendarCard({ calendar, query }: { calendar: PostCalendar; query: string }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(calendar.from, i));
  const bands = BANDS.filter((b) => b.label !== "Dini hari" || calendar.posts.some((p) => p.hour < 5));

  return (
    <div className="flex min-h-72 flex-col rounded-card border border-border/70 bg-card/85 p-5 shadow-[0_24px_48px_-36px_hsl(var(--foreground)/0.35)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lead font-bold tracking-tight">Kalender posting</h2>
        <p className="rounded-full border border-border/70 bg-card px-3 py-1 text-caption text-muted-foreground">
          {fmtYmd(calendar.from)} s.d. {fmtYmd(calendar.to)}
        </p>
      </div>

      {calendar.posts.length === 0 ? (
        <p className="mt-auto pt-6 text-body-sm text-muted-foreground">Tidak ada post yang terbit pada 7 hari ini.</p>
      ) : (
        <div className="relative mt-4 overflow-x-auto pb-1">
          <div className="grid min-w-[40rem] grid-cols-[4.5rem_repeat(7,minmax(0,1fr))]">
            <div />
            {days.map((d) => {
              const date = new Date(`${d}T00:00:00Z`);
              return (
                <div key={d} className="pb-3 text-center">
                  <p className="text-caption text-muted-foreground">{DAY_ABBR[date.getUTCDay()]}</p>
                  <p className="text-body-sm font-medium tabular-nums">{date.getUTCDate()}</p>
                </div>
              );
            })}
            {bands.map((band) => (
              <div key={band.label} className="contents">
                <div className="border-t border-dashed border-border py-2 pr-2 text-caption text-muted-foreground">
                  {band.label}
                  <span className="block tabular-nums">
                    {String(band.from).padStart(2, "0")}.00
                  </span>
                </div>
                {days.map((d) => {
                  const posts = calendar.posts.filter((p) => p.date === d && p.hour >= band.from && p.hour < band.to);
                  return (
                    <div key={d} className="flex flex-col gap-1.5 border-t border-l border-dashed border-border p-1.5">
                      {posts.map((p) => (
                        <Link
                          key={p.id}
                          href={`/konten/${p.id}?${query}`}
                          className="group rounded-2xl bg-ink px-2.5 py-2 text-ink-foreground transition-transform hover:-translate-y-px outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                          title={p.caption ?? undefined}
                        >
                          <span className="flex items-center gap-1.5 text-caption">
                            <span className={cn("size-2 shrink-0 rounded-full", KIND_SWATCH[p.content_kind])} aria-hidden />
                            <span className="truncate">{KIND_LABEL[p.content_kind]}</span>
                          </span>
                          <span className="mt-0.5 block text-caption text-ink-muted tabular-nums">
                            {String(p.hour).padStart(2, "0")}.{String(p.minute).padStart(2, "0")}
                            {p.views !== null ? `, ${fmtCompact(p.views)}` : ""}
                          </span>
                        </Link>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
