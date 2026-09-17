"use client";

import { Suspense, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ListIcon, XIcon } from "@phosphor-icons/react";

import { SidebarNav } from "./sidebar-nav";

/**
 * Drawer menu untuk layar < lg. Ditutup saat item menu diklik, dengan
 * Escape, atau klik latar.
 */
export function MobileNav({ footer }: { footer?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buka menu"
        aria-expanded={open}
        className="inline-flex size-11 items-center justify-center rounded-full border bg-card/90 shadow-sm outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ListIcon className="size-5" aria-hidden />
      </button>
      <AnimatePresence>
        {open ? (
          <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Menu">
            <motion.button
              type="button"
              aria-label="Tutup menu"
              className="absolute inset-0 bg-foreground/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.2 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="absolute inset-y-2 left-2 flex w-[min(20rem,calc(100vw-1rem))] flex-col gap-6 rounded-card border bg-background p-5 shadow-xl"
              initial={reduce ? false : { x: "-105%" }}
              animate={{ x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: "-105%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
            >
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Tutup menu"
                  autoFocus
                  className="inline-flex size-10 items-center justify-center rounded-full border bg-card outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <XIcon className="size-5" aria-hidden />
                </button>
              </div>
              <Suspense fallback={null}>
                <SidebarNav onNavigate={() => setOpen(false)} />
              </Suspense>
              <div className="mt-auto">{footer}</div>
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
