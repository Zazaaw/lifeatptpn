"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ClockIcon,
  ConfettiIcon,
  FileTextIcon,
  ImagesSquareIcon,
  SquaresFourIcon,
  UsersThreeIcon,
  type Icon,
} from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { NAV_ITEMS, RANGE_AWARE, type NavIcon } from "./nav-items";

const ICONS: Record<NavIcon, Icon> = {
  overview: SquaresFourIcon,
  content: ImagesSquareIcon,
  time: ClockIcon,
  audience: UsersThreeIcon,
  wheel: ConfettiIcon,
  report: FileTextIcon,
};

/**
 * Daftar menu. Item aktif = pil gelap (seperti tab aktif di referensi desain).
 * Rentang tanggal dibawa antar halaman yang memakainya.
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const from = params.get("from");
  const to = params.get("to");

  return (
    <nav aria-label="Menu utama">
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = ICONS[item.icon];
          const query = from && to && RANGE_AWARE.has(item.href) ? `?from=${from}&to=${to}` : "";
          return (
            <li key={item.href}>
              <Link
                href={`${item.href}${query}`}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex h-11 items-center gap-3 rounded-full px-4 text-body-sm font-medium transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-card hover:text-foreground"
                )}
              >
                <Icon className="size-5 shrink-0" weight={active ? "fill" : "regular"} aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
