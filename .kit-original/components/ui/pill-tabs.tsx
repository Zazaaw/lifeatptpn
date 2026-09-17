"use client";

import { cn } from "@/lib/utils";

/**
 * PillTabs — the rounded segmented filter used for status filters, view
 * switchers, and category toggles.
 *
 *   const [filter, setFilter] = useState("All");
 *
 *   <PillTabs
 *     tabs={["All", "Upcoming", "Pending", "Completed"]}
 *     value={filter}
 *     onChange={setFilter}
 *   />
 *
 * TWO DETAILS THAT MAKE IT WORK ON MOBILE
 *   1. `w-full md:w-fit` — stretches full-width on phones, hugs content on
 *      desktop. Without this it looks stranded on a narrow screen.
 *   2. The scrollbar-hiding triple:
 *        [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]
 *      Lets the row scroll horizontally when the tabs overflow, without an
 *      ugly scrollbar cutting through the pill.
 */

type PillTabsProps = {
  tabs: readonly string[];
  value: string;
  onChange: (tab: string) => void;
  className?: string;
};

export default function PillTabs({
  tabs,
  value,
  onChange,
  className,
}: PillTabsProps) {
  return (
    <div
      className={cn(
        "flex w-full items-center overflow-x-auto rounded-full border border-neutral-200 bg-white p-1 shadow-sm md:w-fit dark:border-neutral-800 dark:bg-neutral-900",
        "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={cn(
            "whitespace-nowrap rounded-full px-5 py-1.5 text-sm font-medium transition-all duration-300",
            value === tab
              ? "bg-neutral-100 text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-white"
              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
