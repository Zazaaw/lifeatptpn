import { FlagIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";
import { fmtYmdShort } from "@/lib/format";
import { addDays } from "@/lib/range";
import { programSpan, type BtbSection } from "@/lib/being-the-best";
import { sectionFill } from "./bits";

const LEAD = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

/**
 * Program dikelompokkan per minggu due (padanan sheet Ringkasan), diurutkan dari
 * yang paling dekat. Kolom due terdekat yang belum lewat = kartu gelap (titik fokus).
 * Angka mulai/selesai/lead time dihitung dari semua aktivitas program di sheet Gantt.
 */
export function DueLadder({ sections, today }: { sections: BtbSection[]; today: string }) {
  const programs = sections.flatMap((s) => s.programs.map((p) => ({ p, key: s.key, span: programSpan(p) })));
  const byWeek = new Map<string, { label: string; items: typeof programs }>();
  const noDue: typeof programs = [];
  for (const x of programs) {
    if (!x.p.dueWeek) {
      noDue.push(x);
      continue;
    }
    const g = byWeek.get(x.p.dueWeek) ?? { label: x.p.due ?? x.p.dueWeek, items: [] };
    g.items.push(x);
    byWeek.set(x.p.dueWeek, g);
  }
  const weeks = [...byWeek.entries()].sort(([a], [b]) => a.localeCompare(b));
  // Minggu due berakhir Jumat; minggu yang Jumat-nya belum lewat masih "berjalan".
  const focus = weeks.find(([start]) => addDays(start, 4) >= today)?.[0] ?? null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
      {weeks.map(([start, g]) => {
        const lead = start === focus;
        const friday = addDays(start, 4);
        const past = friday < today;
        const thisWeek = start <= today && today <= addDays(start, 6);
        return (
          <section
            key={start}
            aria-label={`Due ${g.label}`}
            className={cn(
              "flex min-w-0 flex-col gap-3 rounded-tile p-4",
              lead ? "ink-glow text-ink-foreground shadow-ink" : "border border-border/70 bg-card/85"
            )}
          >
            <header className="flex flex-col gap-0.5">
              <p className={cn("flex items-center gap-1.5 text-caption font-medium", lead ? "text-ink-muted" : "text-muted-foreground")}>
                <FlagIcon className="size-3.5 text-brand-orange" weight="fill" aria-hidden />
                {thisWeek ? "Due minggu ini" : past ? "Due sudah lewat" : lead ? "Due terdekat" : "Due"}
              </p>
              <h3 className="text-h5 leading-tight font-bold tracking-tight">{g.label}</h3>
              <p className={cn("text-caption tabular-nums", lead ? "text-ink-muted" : "text-muted-foreground")}>
                {fmtYmdShort(start)} s.d. {fmtYmdShort(friday)}, {g.items.length} program
              </p>
            </header>
            <ul className="flex flex-col gap-2">
              {g.items.map(({ p, key, span }) => (
                <li key={p.code} className={cn("flex flex-col gap-1 rounded-[14px] px-3 py-2.5", lead ? "bg-ink-foreground/8" : "bg-muted/70")}>
                  <p className="flex items-start gap-2 text-body-sm leading-snug font-semibold">
                    <span aria-hidden className={cn("mt-1 size-2.5 shrink-0 rounded-[3px]", sectionFill(key))} />
                    <span className="min-w-0">
                      <span className={cn("mr-1 tabular-nums", lead ? "text-ink-muted" : "text-muted-foreground")}>{p.code}</span>
                      {p.name}
                    </span>
                  </p>
                  {span ? (
                    <p className={cn("pl-4.5 text-caption tabular-nums", lead ? "text-ink-muted" : "text-muted-foreground")}>
                      {fmtYmdShort(span.start)} s.d. {fmtYmdShort(span.end)}, {span.count} aktivitas, lead time {LEAD.format(span.leadWeeks)} minggu
                    </p>
                  ) : (
                    <p className="pl-4.5 text-caption text-muted-foreground">Belum ada aktivitas bertanggal</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {noDue.length ? (
        <section className="flex min-w-0 flex-col gap-2 rounded-tile border border-dashed border-border p-4">
          <h3 className="text-body font-bold">Tanpa due</h3>
          <ul className="flex flex-col gap-1 text-body-sm">
            {noDue.map(({ p }) => (
              <li key={p.code}>
                <span className="mr-1 text-muted-foreground tabular-nums">{p.code}</span>
                {p.name}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
