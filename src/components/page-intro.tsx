import type { Icon } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

export type IntroStat = {
  label: string;
  value: string;
  icon: Icon;
  /** Teks lengkap untuk pembaca layar / tooltip (mis. angka tanpa singkatan). */
  title?: string;
};

/**
 * Kepala halaman sebagai satu kartu: judul + angka sorotan di atas, filter
 * halaman (children) di bagian bawah dipisah garis tipis. Satu h1 per layar.
 *
 * Revisi 17 Sep 2026 (keluhan user "atasnya kurang bgt"): sebelumnya judul di
 * kiri dan angka di kanan mengambang terpisah jauh di layar lebar, angka
 * terakhir menempel tepi, dan label filter mepet ke angka. Sekarang angka ada
 * di tile (tile pertama gelap sebagai titik fokus), dan semua isi kepala
 * halaman berada di satu bingkai. Angka tidak pernah membungkus: di layar
 * sempit ukurannya turun satu langkah φ.
 */
export function PageIntro({
  title,
  eyebrow,
  subtitle,
  stats,
  actions,
  children,
  className,
}: {
  title: React.ReactNode;
  /** Baris kecil di atas judul (mis. tanggal hari ini). */
  eyebrow?: React.ReactNode;
  subtitle?: React.ReactNode;
  stats?: IntroStat[];
  /** Tombol di bawah judul (mis. Unduh Excel). */
  actions?: React.ReactNode;
  /** Filter halaman: rentang tanggal, jenis konten, urutan. */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label="Kepala halaman"
      className={cn(
        "hero-wash overflow-hidden rounded-card border border-border/70 shadow-card print:border-0 print:bg-none print:shadow-none",
        className
      )}
    >
      <div className="grid grid-cols-1 gap-6 p-5 md:p-7 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center xl:gap-10">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-caption font-medium text-muted-foreground">{eyebrow}</div>
          ) : null}
          <h1 className="text-h5 leading-tight font-bold tracking-tight md:text-h4 2xl:text-kpi">{title}</h1>
          {subtitle ? <p className="mt-2 max-w-[70ch] text-body-sm text-muted-foreground md:text-body">{subtitle}</p> : null}
          {actions ? <div className="mt-5">{actions}</div> : null}
        </div>

        {stats?.length ? (
          <dl
            className={cn(
              "grid gap-2 sm:gap-3 xl:grid-flow-col xl:grid-cols-none xl:auto-cols-[minmax(10.5rem,auto)] 2xl:auto-cols-[minmax(12.5rem,auto)]",
              stats.length === 2 ? "grid-cols-2" : "grid-cols-3"
            )}
          >
            {stats.map((s, i) => {
              const lead = i === 0;
              return (
                <div
                  key={s.label}
                  title={s.title}
                  className={cn(
                    "flex min-w-0 flex-col-reverse justify-end gap-2 rounded-tile px-3 py-3 sm:gap-2.5 sm:p-4 2xl:p-5",
                    lead ? "ink-glow text-ink-foreground shadow-ink" : "border border-border/70 bg-card/85"
                  )}
                >
                  <dt className={cn("flex items-center gap-1.5 text-caption font-medium", lead ? "text-ink-muted" : "text-muted-foreground")}>
                    <span
                      className={cn(
                        // Ikon disembunyikan di ponsel: tiga tile berbagi 343px, label butuh tempatnya.
                        "hidden size-6 shrink-0 items-center justify-center rounded-full sm:inline-flex",
                        lead ? "bg-brand-orange text-[#172019]" : "bg-brand-green-soft text-brand-green-strong"
                      )}
                    >
                      <s.icon className="size-3.5" weight="bold" aria-hidden />
                    </span>
                    <span className="min-w-0 leading-tight">{s.label}</span>
                  </dt>
                  <dd className="text-h5 leading-none font-bold tracking-tight whitespace-nowrap tabular-nums sm:text-h4 2xl:text-kpi">
                    {s.value}
                  </dd>
                </div>
              );
            })}
          </dl>
        ) : null}
      </div>

      {children ? <div className="no-print border-t border-border/60 bg-card/50 px-5 py-4 md:px-7">{children}</div> : null}
    </section>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
