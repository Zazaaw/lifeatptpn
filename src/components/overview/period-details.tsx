import { CaretDownIcon } from "@phosphor-icons/react/ssr";

import { fmtInt, fmtSignedInt } from "@/lib/format";
import type { Overview } from "@/lib/data";

type Row = { label: string; value: string; note?: string };

/**
 * Rincian periode dalam akordeon (arah desain referensi). Memakai <details>
 * native: bisa dibuka keyboard & pembaca layar tanpa JavaScript.
 */
export function PeriodDetails({ overview, followerNet }: { overview: Overview; followerNet: number | null }) {
  const c = overview.current;
  const groups: { title: string; open?: boolean; rows: Row[] }[] = [
    {
      title: "Interaksi konten",
      open: true,
      rows: [
        { label: "Suka", value: fmtInt(c.likes) },
        { label: "Komentar", value: fmtInt(c.comments) },
        { label: "Dibagikan", value: fmtInt(c.shares) },
        { label: "Disimpan (bersih)", value: fmtInt(c.saves), note: "simpan dikurangi batal simpan" },
      ],
    },
    {
      title: "Profil dan tautan",
      open: true,
      rows: [
        { label: "Kunjungan profil", value: fmtInt(c.profile_views) },
        { label: "Ketukan tautan website", value: fmtInt(c.website_clicks) },
        { label: "Akun yang berinteraksi", value: fmtInt(c.accounts_engaged_sum), note: "jumlah harian, bisa terhitung ulang" },
      ],
    },
    {
      title: "Follower",
      open: true,
      rows: [
        { label: "Follower baru", value: fmtInt(c.new_followers), note: "Meta hanya menyimpan 30 hari" },
        { label: "Jumlah follower terbaru", value: fmtInt(overview.followers.latest?.value) },
        {
          label: "Perubahan bersih",
          value: followerNet === null ? "Belum bisa dihitung" : (fmtSignedInt(followerNet) ?? "0"),
          note: followerNet === null ? "butuh catatan di awal dan akhir rentang" : undefined,
        },
      ],
    },
  ];

  return (
    <div className="flex min-h-72 flex-col rounded-card border border-border/70 bg-card/85 p-3 shadow-[0_24px_48px_-36px_hsl(var(--foreground)/0.35)]">
      {groups.map((g) => (
        <details key={g.title} open={g.open} className="group border-b border-dashed border-border last:border-0">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-tile px-3 py-3.5 text-body-sm font-medium outline-hidden hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            {g.title}
            <CaretDownIcon className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
          </summary>
          <dl className="flex flex-col gap-2.5 px-3 pb-4">
            {g.rows.map((r) => (
              <div key={r.label} className="flex items-baseline justify-between gap-3">
                <dt className="text-body-sm text-muted-foreground">
                  {r.label}
                  {r.note ? <span className="block text-caption">{r.note}</span> : null}
                </dt>
                <dd className="text-body-sm font-semibold tabular-nums">{r.value}</dd>
              </div>
            ))}
          </dl>
        </details>
      ))}
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
