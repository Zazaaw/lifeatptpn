"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import PillTabs from "@/components/ui/pill-tabs";

/**
 * Filter yang ditulis ke query string (satu baris filter di atas semua isi
 * halaman, dataviz interaction rule). Setiap perubahan mengembalikan paging
 * ke halaman 1 supaya user tidak mendarat di halaman kosong.
 */
function useQueryUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const set = (key: string, value: string | null) => {
    const q = new URLSearchParams(params.toString());
    if (value) q.set(key, value);
    else q.delete(key);
    q.delete("page");
    startTransition(() => router.push(`${pathname}?${q.toString()}`, { scroll: false }));
  };
  return { set, pending, params };
}

export function QueryPills({
  name,
  options,
  value,
  label,
}: {
  name: string;
  options: readonly { value: string; label: string }[];
  /** "" = pilihan default (parameter dihapus dari URL). */
  value: string;
  label: string;
}) {
  const { set, pending } = useQueryUpdater();
  return (
    <div className="no-print flex w-full min-w-0 flex-col gap-1.5 md:w-auto">
      <span className="text-caption font-medium text-muted-foreground">{label}</span>
      <PillTabs
        tabs={options}
        value={value}
        onChange={(v) => set(name, v || null)}
        aria-label={label}
        className={pending ? "opacity-60" : undefined}
      />
    </div>
  );
}

export function QuerySelect({
  name,
  options,
  value,
  label,
  id,
}: {
  name: string;
  options: readonly { value: string; label: string }[];
  value: string;
  label: string;
  id: string;
}) {
  const { set, pending } = useQueryUpdater();
  return (
    <div className="no-print flex flex-col gap-1.5">
      <label htmlFor={id} className="text-caption font-medium text-muted-foreground">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={pending}
        onChange={(e) => set(name, e.target.value)}
        className="h-10 rounded-full border border-input bg-card px-4 text-body md:text-body-sm shadow-sm outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
