"use client";

import {
  ChatsCircleIcon,
  FlagIcon,
  InstagramLogoIcon,
  MagnifyingGlassIcon,
  ScissorsIcon,
  SunHorizonIcon,
  UsersThreeIcon,
  VideoCameraIcon,
  type Icon,
} from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { PLAN_ON_FILL, PLAN_SWATCH, PLAN_TYPE_LABEL, type PlanType } from "@/lib/plan-types";

/**
 * Ikon per jenis acara: warna tidak pernah jadi satu-satunya pembeda.
 * Modul client supaya chip yang sama bisa dipakai di form (browser) maupun
 * di halaman server.
 */
export const PLAN_ICON: Record<PlanType, Icon> = {
  shooting: VideoCameraIcon,
  posting: InstagramLogoIcon,
  event: UsersThreeIcon,
  deadline: FlagIcon,
  riset: MagnifyingGlassIcon,
  editing: ScissorsIcon,
  meeting: ChatsCircleIcon,
  libur: SunHorizonIcon,
};

export function PlanChip({ type, className }: { type: PlanType; className?: string }) {
  const IconCmp = PLAN_ICON[type];
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-caption font-semibold",
        PLAN_SWATCH[type],
        PLAN_ON_FILL[type],
        className
      )}
    >
      <IconCmp className="size-3.5" weight="bold" aria-hidden />
      {PLAN_TYPE_LABEL[type]}
    </span>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
