import { CheckCircleIcon, CircleDashedIcon, HourglassIcon, PlayIcon, QuestionIcon, WarningIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";
import { isDone, isInProgress, type Schedule } from "@/lib/being-the-best";

/**
 * Warna bagian. Dua seri kategorikal: hijau (chart-1) dan biru (chart-2), pasangan
 * yang sudah lolos validator dataviz di dua mode (ΔE CVD 22,8 terang / 17,9 gelap).
 * Nama bagian selalu ikut tampil sebagai teks, jadi warna tidak bekerja sendirian.
 */
export const SECTION_FILL: Record<string, string> = {
  above: "bg-chart-1",
  below: "bg-chart-2",
};
export const sectionFill = (key: string) => SECTION_FILL[key] ?? "bg-chart-5";

/** Status persis seperti kolom "Tipe" di file. Teks + ikon, warna hanya pelengkap. */
export function StatusChip({ status }: { status: string | null }) {
  const done = isDone(status);
  const running = !done && isInProgress(status);
  const Icon = !status ? QuestionIcon : done ? CheckCircleIcon : running ? PlayIcon : CircleDashedIcon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-caption font-semibold whitespace-nowrap",
        done
          ? "border-transparent bg-brand-green-soft text-brand-green-strong"
          : running
            ? "border-transparent bg-brand-blue-soft text-foreground"
            : "border-border bg-card text-muted-foreground"
      )}
    >
      <Icon className="size-3.5 shrink-0" weight={running ? "fill" : "bold"} aria-hidden />
      {status ?? "Status kosong"}
    </span>
  );
}

/** Turunan tanggal vs hari ini. Labelnya menyebut "jadwal" supaya tidak dikira status dari tim. */
export function ScheduleChip({ schedule }: { schedule: Schedule }) {
  if (!schedule) return null;
  const late = schedule === "late";
  const Icon = late ? WarningIcon : HourglassIcon;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-brand-orange/40 bg-brand-orange-soft px-2 py-0.5 text-caption font-semibold whitespace-nowrap text-foreground"
      title={late ? "Tanggal selesai di file sudah lewat, status di file belum selesai" : "Hari ini masuk rentang jadwal, status di file masih Not Started"}
    >
      <Icon className="size-3.5 shrink-0 text-brand-orange" weight="bold" aria-hidden />
      {late ? "Lewat jadwal" : "Jadwal sudah mulai"}
    </span>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
