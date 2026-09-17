import { cn } from "@/lib/utils";
import { KIND_LABEL, KIND_ON_FILL, KIND_SWATCH, type ContentKind } from "@/lib/kinds";

/**
 * Label jenis konten berwarna tetap (warna mengikuti entitas, bukan peringkat).
 * Pasangan teks di atas fill sudah dihitung kontrasnya di kinds.ts, jadi warna
 * tidak pernah jadi satu-satunya pembeda: nama jenis selalu tertulis.
 */
export function KindChip({ kind, className }: { kind: ContentKind; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-caption font-semibold",
        KIND_SWATCH[kind],
        KIND_ON_FILL[kind],
        className
      )}
    >
      {KIND_LABEL[kind]}
    </span>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
