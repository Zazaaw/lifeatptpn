"use client";

import { cn } from "@/lib/utils";

/**
 * PillTabs — the rounded segmented filter used for status filters, view
 * switchers, and category toggles.
 *
 *   <PillTabs
 *     tabs={[{ value: "all", label: "Semua" }, { value: "reels", label: "Reels" }]}
 *     value={kind}
 *     onChange={setKind}
 *   />
 *
 * Plain strings still work (`tabs={["All", "Pending"]}`) when value = label.
 *
 * TWO DETAILS THAT MAKE IT WORK ON MOBILE
 *   1. `w-full md:w-fit` — stretches full-width on phones, hugs content on
 *      desktop. Without this it looks stranded on a narrow screen.
 *   2. The scrollbar-hiding triple lets the row scroll horizontally when the
 *      tabs overflow, without a scrollbar cutting through the pill.
 *
 * lifeatptpn-insight: colors use theme tokens (not raw neutral-*) so the pill
 * follows the same greyscale as every other surface; each option exposes
 * aria-pressed for screen readers.
 */

type Tab = string | { value: string; label: string };

type PillTabsProps = {
  tabs: readonly Tab[];
  value: string;
  onChange: (tab: string) => void;
  className?: string;
  "aria-label"?: string;
};

export default function PillTabs({
  tabs,
  value,
  onChange,
  className,
  "aria-label": ariaLabel,
}: PillTabsProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "relative flex w-full items-center overflow-x-auto rounded-full border border-border/70 bg-card/85 p-1 shadow-sm md:w-fit",
        "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
        className
      )}
    >
      {tabs.map((tab) => {
        const v = typeof tab === "string" ? tab : tab.value;
        const label = typeof tab === "string" ? tab : tab.label;
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(v)}
            className={cn(
              "whitespace-nowrap rounded-full px-4 py-1.5 text-body-sm font-medium transition-colors duration-200 outline-hidden focus-visible:ring-1 focus-visible:ring-ring",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
