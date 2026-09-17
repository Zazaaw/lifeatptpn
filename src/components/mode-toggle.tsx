"use client";

import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

/**
 * Toggle tema. Ikon Phosphor (skill-ui-ux §3.C), bukan lucide seperti resep
 * asli style kit. resolvedTheme dipakai supaya klik pertama saat tema
 * "system" langsung membalik tampilan yang sedang terlihat.
 */
export function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Ganti tema terang atau gelap"
      className="no-print"
    >
      <SunIcon className="dark:hidden" />
      <MoonIcon className="hidden dark:block" />
    </Button>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
