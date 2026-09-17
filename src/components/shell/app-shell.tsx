import { Suspense } from "react";
import { WarningIcon } from "@phosphor-icons/react/ssr";

import { ModeToggle } from "@/components/mode-toggle";
import { getMeta, type DashboardMeta } from "@/lib/data";
import { fmtCompact, fmtDateTime, fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LifeAtPtpnLogo, PtpnLogo } from "./brand-logo";
import { MobileNav } from "./mobile-nav";
import { SidebarNav } from "./sidebar-nav";

/** Sync jam-an dianggap terlambat bila lebih dari 3 jam tidak sukses. */
const STALE_HOURS = 3;

function isStale(lastSuccess: string | null) {
  return !lastSuccess || Date.now() - new Date(lastSuccess).getTime() > STALE_HOURS * 3600_000;
}

async function loadMeta(): Promise<DashboardMeta | null> {
  try {
    return await getMeta();
  } catch {
    return null;
  }
}

/**
 * Kerangka aplikasi: sidebar tetap di desktop (lg+), bar atas + drawer di
 * ponsel/tablet. Status sinkron selalu terlihat supaya pembaca tahu
 * seberapa baru angkanya.
 */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const meta = await loadMeta();
  const last = meta?.last_hourly_success ?? null;
  const stale = isStale(last);

  const status = <SyncStatus meta={meta} stale={stale} last={last} />;

  return (
    <div className="relative min-h-dvh">
      <div className="app-backdrop" aria-hidden />

      {/* Sidebar desktop */}
      <aside className="no-print fixed inset-y-4 left-4 z-30 hidden w-64 flex-col gap-6 rounded-card border border-border/70 bg-card/80 p-5 shadow-[0_24px_48px_-32px_hsl(var(--foreground)/0.35)] lg:flex">
        <div className="flex items-center justify-between gap-3 px-1">
          <LifeAtPtpnLogo className="w-24" priority />
          <ModeToggle />
        </div>
        <Suspense fallback={<div className="h-72" />}>
          <SidebarNav />
        </Suspense>
        <div className="mt-auto flex flex-col gap-4">
          {status}
          <div className="flex items-center gap-3 px-1">
            <PtpnLogo className="w-14" />
            <p className="text-caption text-muted-foreground">PT Perkebunan Nusantara III (Persero)</p>
          </div>
        </div>
      </aside>

      {/* Bar atas < lg */}
      <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-3 px-4 pt-3 pb-2 lg:hidden">
        <div className="flex items-center gap-3 rounded-full border border-border/70 bg-card/85 py-1.5 pr-4 pl-2 shadow-sm">
          <LifeAtPtpnLogo className="w-12" priority />
          <span className="text-caption text-muted-foreground">@{meta?.account?.username ?? "lifeatptpn"}</span>
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <MobileNav footer={status} />
        </div>
      </header>

      {/* Konten selebar layar di samping sidebar (permintaan user 17 Sep 2026: tanpa ruang kosong kiri/kanan).
          Jarak kanan = jarak sidebar dari tepi kiri, supaya bingkai simetris. */}
      <main className="relative min-w-0 px-4 pt-4 pb-12 md:px-6 lg:ml-72 lg:pt-6 lg:pr-4 lg:pl-0 print:m-0 print:p-0">
        {children}
      </main>
    </div>
  );
}

function SyncStatus({ meta, stale, last }: { meta: DashboardMeta | null; stale: boolean; last: string | null }) {
  if (!meta) {
    return (
      <div className="flex items-start gap-2 rounded-tile bg-destructive/10 p-3 text-caption text-destructive" role="status">
        <WarningIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        Status sinkron tidak bisa dimuat.
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-tile p-3",
        stale ? "bg-brand-orange-soft text-foreground" : "bg-ink text-ink-foreground"
      )}
      role="status"
      title={last ? `Sinkron terakhir ${fmtDateTime(last)}` : undefined}
    >
      <p className="flex items-center gap-2 text-caption font-medium">
        {stale ? (
          <WarningIcon className="size-4 shrink-0 text-brand-orange" aria-hidden />
        ) : (
          <span className="relative flex size-2" aria-hidden>
            <span className="absolute inset-0 animate-ping rounded-full bg-brand-green opacity-60 motion-reduce:hidden" />
            <span className="relative size-2 rounded-full bg-brand-green" />
          </span>
        )}
        {stale ? "Sinkron terlambat" : "Sinkron otomatis aktif"}
      </p>
      <p className={cn("text-caption", stale ? "text-muted-foreground" : "text-ink-muted")}>
        Data {fmtRelative(last)}
        {meta.account?.followers_count ? `, ${fmtCompact(meta.account.followers_count)} follower` : ""}
      </p>
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
