import { FlagIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";
import { fmtYmd, fmtYmdShort } from "@/lib/format";
import { addDays } from "@/lib/range";
import {
  activitiesOf,
  axisOf,
  monthsOf,
  nextCode,
  programSpan,
  scheduleOf,
  type BtbActivity,
  type BtbItem,
  type BtbProgram,
  type BtbSection,
  type BtbWeek,
} from "@/lib/being-the-best";
import { ScheduleChip, sectionFill, StatusChip } from "./bits";
import { AddItemButton, EditItemButton, EditProgramButton } from "./edit-dialogs";

/** Bahan tombol edit. null = mode baca (tanpa PIN): tidak ada tombol sama sekali. */
export type GanttEdit = { pics: string[]; codes: string[] } | null;

/** Semua yang dibutuhkan satu baris untuk menggambar kanvasnya. */
type Ctx = {
  axis: ReturnType<typeof axisOf>;
  weekCount: number;
  monthStarts: string[];
  today: string;
  edit: GanttEdit;
};

export type GanttFilter = (a: BtbActivity) => boolean;

const ROW = "grid grid-cols-[var(--name-w)_minmax(40rem,1fr)]";
const NAME = "sticky left-0 z-10 border-r border-border/70 bg-card";

const dateSpan = (a: { start: string; end: string }) =>
  a.start === a.end ? fmtYmdShort(a.start) : `${fmtYmdShort(a.start)} s.d. ${fmtYmdShort(a.end)}`;

/** Tengah hari `ymd` di sumbu (posisi garis hari ini). */
const midOf = (ctx: Ctx, ymd: string) => ctx.axis.at(ymd) + (100 / ctx.axis.days) * 0.5;

/**
 * Kanvas satu baris: garis tiap minggu (gradien), garis awal bulan lebih tegas,
 * pita minggu due program, dan garis hari ini. Semua posisi dalam persen dari
 * sumbu yang sama, jadi baris mana pun sejajar dengan header.
 */
function Lane({ ctx, due, dueStrong, children }: { ctx: Ctx; due?: string | null; dueStrong?: boolean; children?: React.ReactNode }) {
  const { axis } = ctx;
  return (
    <div
      className="relative"
      style={{
        backgroundImage: "linear-gradient(to right, hsl(var(--border) / 0.55) 1px, transparent 1px)",
        backgroundSize: `${100 / ctx.weekCount}% 100%`,
      }}
    >
      {ctx.monthStarts.map((m) => (
        <span key={m} aria-hidden className="absolute inset-y-0 w-px bg-border" style={{ left: `${axis.at(m)}%` }} />
      ))}
      {due && axis.contains(due) ? (
        <span
          aria-hidden
          className={cn("absolute inset-y-0", dueStrong ? "bg-brand-orange-soft" : "bg-brand-orange-soft/45")}
          style={{ left: `${axis.at(due)}%`, width: `${axis.span(due, addDays(due, 6))}%` }}
        />
      ) : null}
      {axis.contains(ctx.today) ? (
        <span aria-hidden className="absolute inset-y-0 z-[1] w-0.5 -translate-x-1/2 bg-brand-orange" style={{ left: `${midOf(ctx, ctx.today)}%` }} />
      ) : null}
      {children}
    </div>
  );
}

/**
 * Batang aktivitas memenuhi tinggi baris (sisa 10px atas-bawah) supaya terlihat
 * jelas di baris yang tinggi (permintaan user 12 Nov 2026: "digedein, ngefull").
 * Cincin 2px warna kartu memisahkannya dari garis hari ini. Batang program tetap
 * tipis karena hanya ringkasan rentang.
 */
function Bar({ ctx, from, to, fill, thin, label }: { ctx: Ctx; from: string; to: string; fill: string; thin?: boolean; label: string }) {
  return (
    <span
      title={label}
      className={cn(
        "absolute z-[2]",
        fill,
        thin ? "top-1/2 h-2.5 -translate-y-1/2 rounded-[4px] opacity-55" : "inset-y-2.5 min-w-2.5 rounded-[6px] ring-2 ring-card"
      )}
      style={{ left: `${ctx.axis.at(from)}%`, width: `${ctx.axis.span(from, to)}%` }}
    />
  );
}

/** Judul baris + tombol ubah di kanan (hanya mode edit). */
function TitleLine({ ctx, item, className, children }: { ctx: Ctx; item?: BtbItem; className?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-1">
      <p className={cn("min-w-0 flex-1 text-body-sm leading-snug", className)}>{children}</p>
      {ctx.edit && item ? <EditItemButton item={item} pics={ctx.edit.pics} /> : null}
    </div>
  );
}

function ActivityRow({ ctx, a, fill, due }: { ctx: Ctx; a: BtbActivity; fill: string; due: string | null }) {
  const label = `${a.code} ${a.name}: ${fmtYmd(a.start)} s.d. ${fmtYmd(a.end)} (${a.workdays} hari kerja)`;
  return (
    <li className={cn(ROW, "border-b border-border/50")}>
      <div className={cn(NAME, "flex min-w-0 flex-col gap-1 py-2.5 pr-2 lg:pr-3", a.group ? "pl-6 lg:pl-8" : "pl-3 lg:pl-4")}>
        <TitleLine ctx={ctx} item={a} className="font-medium">
          <span className="mr-1.5 text-caption font-semibold text-muted-foreground tabular-nums">{a.code}</span>
          {a.name}
        </TitleLine>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
          <span className="tabular-nums">{dateSpan(a)}</span>
          <span className="tabular-nums">{a.workdays} hari kerja</span>
          <span>{a.pic ?? "PIC belum diisi"}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusChip status={a.status} />
          <ScheduleChip schedule={scheduleOf(a, ctx.today)} />
        </div>
        {a.note ? <p className="text-caption text-muted-foreground">Keterangan: {a.note}</p> : null}
      </div>
      <Lane ctx={ctx} due={due}>
        <Bar ctx={ctx} from={a.start} to={a.end} fill={fill} label={label} />
      </Lane>
    </li>
  );
}

function ProgramBlock({ ctx, p, fill, visible }: { ctx: Ctx; p: BtbProgram; fill: string; visible: GanttFilter }) {
  const span = programSpan(p);
  const filtering = activitiesOf(p).some((a) => !visible(a));
  // Sub-kelompok (A3.1, A4.2, ...) tampil bila ada aktivitas di bawahnya yang lolos filter,
  // atau tanpa filter sama sekali (kelompok baru yang belum punya aktivitas tetap terlihat).
  const rows: BtbItem[] = p.items.filter((it) =>
    it.kind === "activity"
      ? visible(it)
      : !filtering || p.items.some((c) => c.kind === "activity" && c.group === it.code && visible(c))
  );
  const total = span?.count ?? 0;
  const shown = rows.filter((r) => r.kind === "activity").length;
  const lastPic = activitiesOf(p).at(-1)?.pic ?? null;

  return (
    <ol aria-label={`${p.code} ${p.name}`}>
      <li className={cn(ROW, "border-b border-border/70")}>
        <div className={cn(NAME, "flex min-w-0 flex-col gap-1 bg-muted py-3 pr-2 pl-3 lg:pr-3 lg:pl-4")}>
          <div className="flex items-start gap-1">
            <p className="min-w-0 flex-1 text-body-sm leading-snug font-bold">
              <span className="mr-1.5 text-muted-foreground tabular-nums">{p.code}</span>
              {p.name}
            </p>
            {ctx.edit ? <EditProgramButton program={p} rows={p.items.length} /> : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
            {p.due ? (
              <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                <FlagIcon className="size-3.5 text-brand-orange" weight="fill" aria-hidden />
                Due {p.due}
              </span>
            ) : (
              <span>Due belum diisi</span>
            )}
            {span ? <span className="tabular-nums">{dateSpan(span)}</span> : null}
            <span className="tabular-nums">{shown === total ? `${total} aktivitas` : `${shown} dari ${total} aktivitas`}</span>
          </div>
          {ctx.edit ? (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <AddItemButton
                label="Aktivitas"
                pics={ctx.edit.pics}
                draft={{ kind: "activity", code: nextCode(p.code, ctx.edit.codes), start: ctx.today, pic: lastPic }}
              />
              <AddItemButton label="Judul kelompok" pics={ctx.edit.pics} draft={{ kind: "group", code: nextCode(p.code, ctx.edit.codes) }} />
            </div>
          ) : null}
        </div>
        <Lane ctx={ctx} due={p.dueWeek} dueStrong>
          {span ? (
            <Bar ctx={ctx} from={span.start} to={span.end} fill={fill} thin label={`${p.code} ${p.name}: ${fmtYmd(span.start)} s.d. ${fmtYmd(span.end)}`} />
          ) : null}
        </Lane>
      </li>
      {rows.map((it) =>
        it.kind === "group" ? (
          <li key={it.id} className={cn(ROW, "border-b border-border/50")}>
            <div className={cn(NAME, "flex min-w-0 flex-col gap-0.5 py-2 pr-2 pl-3 lg:pr-3 lg:pl-4")}>
              <TitleLine ctx={ctx} item={it} className="font-semibold">
                <span className="mr-1.5 text-caption text-muted-foreground tabular-nums">{it.code}</span>
                {it.name}
              </TitleLine>
              {it.note ? <p className="text-caption text-muted-foreground">Keterangan: {it.note}</p> : null}
              {ctx.edit ? (
                <div className="pt-1">
                  <AddItemButton
                    label={`Aktivitas di ${it.code}`}
                    pics={ctx.edit.pics}
                    draft={{ kind: "activity", code: nextCode(it.code, ctx.edit.codes), start: ctx.today, pic: lastPic }}
                  />
                </div>
              ) : null}
            </div>
            <Lane ctx={ctx} due={p.dueWeek} />
          </li>
        ) : (
          <ActivityRow key={it.id} ctx={ctx} a={it} fill={fill} due={p.dueWeek} />
        )
      )}
    </ol>
  );
}

/**
 * Gantt mengikuti sheet "Gantt" file tim: kolom per minggu (W1 = minggu yang
 * Senin-nya paling awal di bulan itu), batang dengan presisi hari dari Start/End.
 * Kolom nama lengket di kiri dan header lengket di atas, jadi bisa digulir dua
 * arah di ponsel. Semua angka juga tertulis sebagai teks di kolom nama; batang
 * hanya penguat visual.
 */
export function Gantt({
  weeks,
  sections,
  today,
  visible,
  edit,
}: {
  weeks: BtbWeek[];
  sections: BtbSection[];
  today: string;
  visible: GanttFilter;
  edit: GanttEdit;
}) {
  const months = monthsOf(weeks);
  const ctx: Ctx = {
    axis: axisOf(weeks),
    weekCount: Math.max(weeks.length, 1),
    monthStarts: months.slice(1).map((m) => weeks[m.first].start),
    today,
    edit,
  };
  // Mode edit: program tanpa aktivitas tetap tampil supaya bisa diisi.
  const showProgram = (p: BtbProgram) => p.items.some((i) => i.kind === "activity" && visible(i)) || (edit !== null && activitiesOf(p).length === 0);

  return (
    <div className="relative max-h-[78dvh] overflow-auto rounded-tile border border-border/70 bg-card [--name-w:14rem] lg:[--name-w:19rem] 2xl:[--name-w:23rem]">
      <div className="min-w-[calc(var(--name-w)+40rem)]">
        {/* ---- header bulan + minggu ---------------------------------------------- */}
        <div className="sticky top-0 z-20 border-b border-border bg-card">
          <div className={ROW}>
            <div className={cn(NAME, "z-30 flex items-end px-3 pt-2 text-caption font-semibold text-muted-foreground lg:px-4")}>Program dan aktivitas</div>
            <div className="flex border-b border-border/70">
              {months.map((m, i) => (
                <div
                  key={m.month}
                  className={cn("px-2 py-1.5 text-caption font-bold whitespace-nowrap", i > 0 && "border-l border-border")}
                  style={{ width: `${(m.count / weeks.length) * 100}%` }}
                >
                  {m.month}
                </div>
              ))}
            </div>
          </div>
          <div className={ROW}>
            <div className={cn(NAME, "z-30")} aria-hidden />
            <div className="relative flex">
              {weeks.map((w, i) => (
                <div
                  key={w.start}
                  title={`${w.label} ${w.month}: ${fmtYmd(w.start)} s.d. ${fmtYmd(addDays(w.start, 4))}`}
                  className={cn(
                    "flex flex-col items-center py-1 text-caption leading-tight",
                    i > 0 && (ctx.monthStarts.includes(w.start) ? "border-l border-border" : "border-l border-border/55")
                  )}
                  style={{ width: `${100 / weeks.length}%` }}
                >
                  <span className="font-semibold">{w.label}</span>
                  <span className="text-muted-foreground tabular-nums">{fmtYmdShort(w.start).split(" ")[0]}</span>
                </div>
              ))}
              {ctx.axis.contains(today) ? (
                <span
                  className="absolute top-full z-[1] mt-0.5 -translate-x-1/2 rounded-full bg-brand-orange px-1.5 text-caption leading-4 font-bold whitespace-nowrap text-[#172019]"
                  style={{ left: `${midOf(ctx, today)}%` }}
                >
                  Hari ini
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* ---- isi ---------------------------------------------------------------- */}
        {sections.map((s) => {
          const programs = s.programs.filter(showProgram);
          if (!programs.length) return null;
          const fill = sectionFill(s.key);
          return (
            <section key={s.key} aria-label={s.label}>
              <div className={cn(ROW, "border-b border-border bg-secondary")}>
                <h3 className={cn(NAME, "flex items-center gap-2 bg-secondary px-3 py-2 text-body-sm font-bold lg:px-4")}>
                  <span aria-hidden className={cn("size-3 shrink-0 rounded-[4px]", fill)} />
                  {s.label}
                </h3>
                <div aria-hidden />
              </div>
              {programs.map((p) => (
                <ProgramBlock key={p.code} ctx={ctx} p={p} fill={fill} visible={visible} />
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
