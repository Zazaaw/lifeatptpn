import { Skeleton } from "@/components/ui/skeleton";

/** Kerangka mengikuti tata letak halaman: kartu kepala (judul, tile angka, filter), bento, satu grafik. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Memuat data">
      {/* Kepala halaman: satu kartu berisi judul, tile angka, dan baris filter */}
      <div className="flex flex-col overflow-hidden rounded-card border border-border/70 bg-card/60">
        <div className="flex flex-col gap-6 p-5 md:p-7 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-44 rounded-full" />
            <Skeleton className="h-10 w-96 max-w-full rounded-full" />
            <Skeleton className="h-4 w-72 max-w-full rounded-full" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-tile xl:w-44" />
            ))}
          </div>
        </div>
        <div className="border-t border-border/60 px-5 py-4 md:px-7">
          <Skeleton className="h-11 w-full rounded-full md:w-[36rem]" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-72 rounded-card" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-card" />
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
