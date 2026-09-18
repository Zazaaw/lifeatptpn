import Link from "next/link";
import { CameraIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";
import { addDays } from "@/lib/range";
import { PLAN_SWATCH, PLAN_TYPE_LABEL, type PlanEvent, type PlanPost } from "@/lib/plan-types";

const DAY_HEAD = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
/** Maksimal acara yang ditulis penuh di satu kotak; sisanya jadi "+N lagi". */
const MAX_PER_DAY = 3;

function hhmm(h: number, m: number) {
  return `${String(h).padStart(2, "0")}.${String(m).padStart(2, "0")}`;
}

/**
 * Kalender satu bulan (minggu mulai Senin, tanggal WIB).
 *
 * Kotak tanggal adalah tautan: memilih tanggal hanya mengubah query string,
 * jadi detail hari dirender di server dan tetap bisa dibagikan atau dibuka
 * ulang lewat tombol kembali browser.
 */
export function MonthCalendar({
  gridFrom,
  month,
  today,
  selected,
  events,
  posts,
  hrefFor,
}: {
  /** Senin pertama pada grid (bisa masuk bulan sebelumnya). */
  gridFrom: string;
  /** Bulan yang sedang dilihat, format YYYY-MM. */
  month: string;
  today: string;
  selected: string;
  events: PlanEvent[];
  posts: PlanPost[];
  hrefFor: (date: string) => string;
}) {
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridFrom, i));
  // Grid 6 baris kadang menyisakan satu baris kosong di luar bulan: dipangkas.
  const weeks: string[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    const week = days.slice(i, i + 7);
    if (i >= 28 && week.every((d) => !d.startsWith(month))) break;
    weeks.push(week);
  }

  const byDay = new Map<string, PlanEvent[]>();
  for (const e of events) {
    // Acara lintas hari muncul di setiap hari yang dilewatinya.
    for (let d = e.date; d <= e.end_date; d = addDays(d, 1)) {
      const list = byDay.get(d) ?? [];
      list.push(e);
      byDay.set(d, list);
      if (d === e.end_date) break;
    }
  }
  const postsByDay = new Map<string, PlanPost[]>();
  for (const p of posts) postsByDay.set(p.date, [...(postsByDay.get(p.date) ?? []), p]);

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-7 gap-1 pb-2">
        {DAY_HEAD.map((d) => (
          <span key={d} className="text-center text-caption font-semibold text-muted-foreground">
            {d}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        {weeks.map((week) => (
          <div key={week[0]} className="grid grid-cols-7 gap-1">
            {week.map((date) => {
              const inMonth = date.startsWith(month);
              const isToday = date === today;
              const isSelected = date === selected;
              const dayEvents = byDay.get(date) ?? [];
              const dayPosts = postsByDay.get(date) ?? [];
              const shown = dayEvents.slice(0, MAX_PER_DAY);
              const rest = dayEvents.length - shown.length;
              return (
                <Link
                  key={date}
                  href={hrefFor(date)}
                  scroll={false}
                  aria-current={isSelected ? "date" : undefined}
                  className={cn(
                    "group flex min-h-24 flex-col gap-1 rounded-tile border p-1.5 text-left transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-ring md:min-h-32",
                    inMonth ? "border-border/70 bg-card/70 hover:bg-accent/50" : "border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/50",
                    isSelected && "border-foreground/60 bg-card shadow-card"
                  )}
                >
                  <span className="flex items-center justify-between gap-1">
                    <span
                      className={cn(
                        "inline-flex size-6 items-center justify-center rounded-full text-caption font-bold tabular-nums",
                        isToday ? "bg-brand-orange text-[#172019]" : isSelected ? "bg-foreground text-background" : ""
                      )}
                    >
                      {Number(date.slice(8, 10))}
                    </span>
                    {dayPosts.length ? (
                      <span
                        className="inline-flex items-center gap-0.5 rounded-full bg-brand-green-soft px-1.5 text-caption font-semibold text-brand-green-strong tabular-nums"
                        title={`${dayPosts.length} postingan terbit pada tanggal ini`}
                      >
                        <CameraIcon className="size-3" weight="bold" aria-hidden />
                        {dayPosts.length}
                      </span>
                    ) : null}
                  </span>

                  {/* Ponsel: kotak terlalu sempit untuk judul, jadi hanya titik warna.
                      Rincian lengkap tetap ada di panel hari setelah tanggal dipilih. */}
                  <span className="flex flex-wrap gap-1 sm:hidden">
                    {dayEvents.slice(0, 6).map((e) => (
                      <span key={e.id} className={cn("size-2 rounded-full", PLAN_SWATCH[e.event_type])} aria-hidden />
                    ))}
                    {dayEvents.length > 6 ? <span className="text-caption leading-none text-muted-foreground">+</span> : null}
                  </span>

                  <span className="hidden min-w-0 flex-col gap-1 sm:flex">
                    {shown.map((e) => (
                      <span key={e.id} className="flex min-w-0 items-center gap-1">
                        <span className={cn("size-2 shrink-0 rounded-full", PLAN_SWATCH[e.event_type])} aria-hidden />
                        <span className={cn("truncate text-caption", e.status === "batal" && "line-through opacity-60")}>
                          <span className="tabular-nums">{e.all_day ? "Seharian" : hhmm(e.hour, e.minute)}</span> {e.title}
                        </span>
                      </span>
                    ))}
                    {rest > 0 ? <span className="text-caption font-semibold text-muted-foreground">+{rest} lagi</span> : null}
                  </span>

                  <span className="sr-only">
                    {dayEvents.length === 0
                      ? "tidak ada acara"
                      : dayEvents.map((e) => `${PLAN_TYPE_LABEL[e.event_type]}: ${e.title}`).join(", ")}
                    {dayPosts.length ? `, ${dayPosts.length} postingan terbit` : ""}
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
