"use client";

import { useEffect } from "react";
import { WarningIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";

/**
 * Galat dari server tampil sebagai galat, tidak pernah sebagai halaman kosong
 * (skill-analysis §13). Detail teknis hanya di log server; di produksi Next.js
 * memang menyembunyikan pesan aslinya dari browser.
 */
export default function ErrorBoundary({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-8">
      <p className="flex items-center gap-2 text-lead font-semibold">
        <WarningIcon className="size-5 text-destructive" aria-hidden />
        Halaman gagal dimuat
      </p>
      <p className="max-w-[60ch] text-body-sm text-muted-foreground">
        Terjadi galat saat menyiapkan data halaman ini. Angka sengaja tidak ditampilkan supaya tidak terbaca sebagai
        nol. Coba lagi; jika terus gagal, sampaikan kode galat di bawah ke pengelola dashboard untuk dicek di log server.
      </p>
      {error.digest ? <p className="text-caption text-muted-foreground">Kode galat: {error.digest}</p> : null}
      <Button onClick={() => retry()}>Coba lagi</Button>
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-analysis
