"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";

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
  const set = (key: string, value: string | null, replace = false) => {
    const q = new URLSearchParams(params.toString());
    if (value) q.set(key, value);
    else q.delete(key);
    q.delete("page");
    const url = `${pathname}?${q.toString()}`;
    startTransition(() => (replace ? router.replace(url, { scroll: false }) : router.push(url, { scroll: false })));
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

/**
 * Kotak cari yang ditulis ke query string setelah user berhenti mengetik
 * (350 ms). Memakai router.replace supaya tombol kembali tidak melewati satu
 * per satu huruf. Pemanggil memberi `key={value}` agar isian ikut kosong saat
 * filter di-reset dari luar.
 */
export function QuerySearch({
  name,
  value,
  label,
  placeholder,
  id,
}: {
  name: string;
  value: string;
  label: string;
  placeholder?: string;
  id: string;
}) {
  const { set, pending } = useQueryUpdater();
  const [text, setText] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const commit = (v: string) => {
    clearTimeout(timer.current);
    if (v.trim() !== value) set(name, v.trim() || null, true);
  };

  return (
    <form
      role="search"
      className="no-print flex min-w-0 flex-col gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        commit(text);
      }}
    >
      <label htmlFor={id} className="text-caption font-medium text-muted-foreground">
        {label}
      </label>
      <span className="relative">
        <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          id={id}
          type="search"
          value={text}
          maxLength={80}
          placeholder={placeholder}
          onChange={(e) => {
            const v = e.target.value;
            setText(v);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => commit(v), 350);
          }}
          className={
            "h-10 w-full rounded-full border border-input bg-card pr-4 pl-10 text-body shadow-sm outline-hidden placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring md:text-body-sm" +
            (pending ? " opacity-70" : "")
          }
        />
      </span>
    </form>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
