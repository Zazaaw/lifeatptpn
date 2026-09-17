import { cn } from "@/lib/utils";
import { fmtInt, fmtPct } from "@/lib/format";
import { KIND_LABEL, KIND_ON_FILL, KIND_SWATCH } from "@/lib/kinds";
import type { KindSummary } from "@/lib/data";

/**
 * Komposisi jenis konten: satu baris pil bersegmen (arah desain referensi).
 * Lebar segmen = porsi jumlah post. Segmen sangat kecil diberi lebar minimum
 * supaya tetap terlihat; angka persen yang tertulis tetap angka sebenarnya.
 * Urutan & warna mengikuti jenis (tetap), bukan peringkat.
 */
const ORDER = ["reels", "carousel", "foto", "story", "video"] as const;

export function ContentMix({ kinds }: { kinds: KindSummary[] }) {
  const total = kinds.reduce((s, k) => s + k.posts, 0);
  if (total === 0) return null;
  const rows = ORDER.map((kind) => kinds.find((k) => k.kind === kind)).filter((k): k is KindSummary => Boolean(k));

  return (
    <div className="flex flex-col gap-2" aria-label="Komposisi jenis konten">
      <div className="flex gap-[2px] sm:gap-1.5">
        {rows.map((k) => {
          const share = k.posts / total;
          return (
            <div
              key={k.kind}
              className="flex min-w-[3.25rem] flex-col gap-1.5"
              style={{ flexGrow: share, flexBasis: 0 }}
            >
              <span className="truncate text-caption text-muted-foreground">{KIND_LABEL[k.kind]}</span>
              <span
                className={cn(
                  "flex h-10 items-center rounded-full px-3 text-caption font-semibold tabular-nums",
                  KIND_SWATCH[k.kind],
                  KIND_ON_FILL[k.kind]
                )}
                title={`${KIND_LABEL[k.kind]}: ${fmtInt(k.posts)} post`}
              >
                {fmtPct(share, 0)}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-caption text-muted-foreground">
        Porsi dari {fmtInt(total)} post yang terbit pada rentang ini.
      </p>
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
