import { InfoIcon, WarningIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";

/** Catatan kontekstual: keterbatasan data, parameter yang dikoreksi, dsb. */
export function Notice({
  tone = "info",
  children,
  className,
}: {
  tone?: "info" | "warning";
  children: React.ReactNode;
  className?: string;
}) {
  const Icon = tone === "warning" ? WarningIcon : InfoIcon;
  return (
    <div
      role={tone === "warning" ? "alert" : "note"}
      className={cn(
        "flex gap-2.5 rounded-tile border px-4 py-3 text-body-sm",
        tone === "warning"
          ? "border-brand-orange/40 bg-brand-orange-soft text-foreground"
          : "border-border/70 bg-card/80 text-muted-foreground",
        className
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", tone === "warning" && "text-brand-orange")} aria-hidden />
      <div className="min-w-0 [&_strong]:font-semibold [&_strong]:text-foreground">{children}</div>
    </div>
  );
}

/** Tampilan kosong yang menjelaskan kenapa kosong dan apa yang bisa dilakukan. */
export function EmptyState({
  title,
  children,
  className,
}: {
  title: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-start gap-1.5 rounded-tile border border-dashed border-border px-5 py-8", className)}>
      <p className="text-body font-bold">{title}</p>
      {children ? <div className="max-w-[60ch] text-body-sm text-muted-foreground">{children}</div> : null}
    </div>
  );
}

export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("print-break-avoid flex flex-col gap-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lead font-bold tracking-tight">{title}</h2>
          {description ? <p className="mt-1 max-w-[70ch] text-body-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
