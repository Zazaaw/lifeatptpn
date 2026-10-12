import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import {
  ChartLineUpIcon,
  CrownIcon,
  DeviceMobileIcon,
  GearSixIcon,
  HandHeartIcon,
  HandshakeIcon,
  LeafIcon,
  LightbulbFilamentIcon,
  LightbulbIcon,
  MedalIcon,
  PlantIcon,
  RocketLaunchIcon,
  ShieldWarningIcon,
  SparkleIcon,
  TrendUpIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/ssr";

import { PILLAR_STYLE, PILLARS, RUBRIKS, type CpList, type Pillar, type Rubrik } from "@/lib/content-plan";
import { cn } from "@/lib/utils";

const PILLAR_ICON: Record<Pillar, Icon> = {
  business_savvy: ChartLineUpIcon,
  operational_excellence: GearSixIcon,
  risk_culture: ShieldWarningIcon,
  digital_culture: DeviceMobileIcon,
  innovation_culture: LightbulbIcon,
  esg: LeafIcon,
  humanizing_human: HandHeartIcon,
  rwp: HandshakeIcon,
};

const RUBRIK_ICON: Record<Rubrik, Icon> = {
  lifeasnusantaraentreplanters: PlantIcon,
  oneweekonetips: LightbulbFilamentIcon,
  respectfulinclusiveworkplace: UsersThreeIcon,
  tumbuhdiptpn: TrendUpIcon,
  ceritainovator: RocketLaunchIcon,
  levelupchangeagent: MedalIcon,
  motivasientreplanters: SparkleIcon,
  sipalingculture: CrownIcon,
};

/**
 * 8 pilar dan 8 rubrik dalam satu kartu. Tiap tile adalah filter (klik sekali
 * menyaring tabel, klik lagi melepas) dan setiap angkanya data nyata:
 * - pilar: jumlah konten di periode ini
 * - rubrik: jumlah rencana, dan jumlah post Instagram di periode yang sama
 *   yang captionnya memuat hashtag rubrik tersebut.
 * Warna pilar selalu ditemani nama pilar (uji semua pasangan palet gagal,
 * jadi warna bukan satu-satunya penanda).
 */
export function TaxonomyCard({
  data,
  activePillar,
  activeRubrik,
  hrefFor,
  periodLabel,
}: {
  data: CpList;
  activePillar: Pillar | null;
  activeRubrik: Rubrik | null;
  hrefFor: (next: { pilar?: Pillar | null; rubrik?: Rubrik | null }) => string;
  periodLabel: string;
}) {
  return (
    <section aria-label="Pilar dan rubrik" className="flex flex-col gap-6 rounded-card border border-border/70 bg-card/85 p-4 shadow-card md:p-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-lead font-bold tracking-tight">8 Pillar Content</h2>
          <p className="text-caption text-muted-foreground">Jumlah konten {periodLabel}. Klik pilar untuk menyaring tabel.</p>
        </div>
        <ul className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4 2xl:grid-cols-8">
          {PILLARS.map((p) => {
            const PIcon = PILLAR_ICON[p.slug];
            const style = PILLAR_STYLE[p.slug];
            const active = activePillar === p.slug;
            const n = data.by_pillar[p.slug] ?? 0;
            return (
              <li key={p.slug} className="min-w-0">
                <Link
                  href={hrefFor({ pilar: active ? null : p.slug })}
                  scroll={false}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex h-full min-w-0 flex-col gap-2.5 rounded-tile border p-3 transition outline-hidden hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-3.5",
                    style.tile,
                    active && cn("ring-2 ring-offset-2 ring-offset-card", style.ring)
                  )}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-card/85 shadow-sm", style.icon)}>
                      <PIcon className="size-5" weight="duotone" aria-hidden />
                    </span>
                    <span className="text-lead leading-none font-bold tabular-nums" aria-label={`${n} konten`}>
                      {n}
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-body-sm leading-tight font-bold">{p.label}</span>
                    <span className="mt-0.5 block text-caption leading-snug text-muted-foreground">{p.tagline}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-col gap-3 border-t border-border/60 pt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-lead font-bold tracking-tight">Rubrik Konten</h2>
          <p className="text-caption text-muted-foreground">Rencana dan post terbit {periodLabel} yang memakai hashtag rubrik.</p>
        </div>
        <ul className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:grid-cols-4 2xl:grid-cols-8">
          {RUBRIKS.map((r) => {
            const RIcon = RUBRIK_ICON[r.slug];
            const active = activeRubrik === r.slug;
            const n = data.by_rubrik[r.slug] ?? { plan: 0, posts: 0 };
            return (
              <li key={r.slug} className="min-w-0">
                <Link
                  href={hrefFor({ rubrik: active ? null : r.slug })}
                  scroll={false}
                  aria-current={active ? "true" : undefined}
                  title={`#${r.slug}`}
                  className={cn(
                    "flex h-full min-w-0 items-center gap-2.5 rounded-tile border border-border/70 bg-card px-3 py-2.5 transition outline-hidden hover:border-brand-green/60 hover:bg-brand-green-soft/40 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                    active && "border-brand-green bg-brand-green-soft ring-1 ring-brand-green"
                  )}
                >
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-green-soft text-brand-green-strong">
                    <RIcon className="size-4" weight="bold" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-caption leading-tight font-semibold">{r.label}</span>
                    <span className="block text-caption leading-tight text-muted-foreground tabular-nums">
                      {n.plan} rencana, {n.posts} terbit
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
