"use client";

import { useState } from "react";
import { DownloadSimpleIcon, PrinterIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";

/**
 * Unduh Excel lewat fetch (bukan link biasa) supaya ada status "sedang
 * disiapkan", tombol tidak bisa diklik dua kali, dan galat server tampil
 * sebagai pesan, bukan file rusak berisi HTML (skill-analysis §12).
 */
export function ReportActions({ excelHref }: { excelHref: string }) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  async function download() {
    setState("loading");
    try {
      const res = await fetch(excelHref);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") ?? "";
      const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? "laporan-instagram.xlsx";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      setState("idle");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => window.print()}>
          <PrinterIcon aria-hidden /> Cetak
        </Button>
        <Button onClick={download} disabled={state === "loading"}>
          <DownloadSimpleIcon aria-hidden />
          {state === "loading" ? "Menyiapkan file…" : "Unduh Excel"}
        </Button>
      </div>
      {state === "error" ? (
        <p className="text-caption text-destructive" role="alert">
          File gagal dibuat. Coba lagi sebentar lagi.
        </p>
      ) : null}
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-analysis
