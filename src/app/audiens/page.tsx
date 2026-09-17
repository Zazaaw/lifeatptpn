import type { Metadata } from "next";
import Image from "next/image";
import { GenderFemaleIcon, GenderMaleIcon, GlobeHemisphereEastIcon, MapPinIcon, UserIcon, UsersThreeIcon } from "@phosphor-icons/react/ssr";

import BlurFade from "@/components/effects/blur-fade";
import { PageIntro } from "@/components/page-intro";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HourColumns } from "@/components/charts/hour-columns";
import { EmptyState } from "@/components/notice";
import { getAudience, type Audience } from "@/lib/data";
import { fmtCompact, fmtInt, fmtPct, fmtYmd } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Audiens" };

/** Warna tetap per gender (entitas), sama dengan versi sebelumnya supaya tidak berubah makna. */
const GENDER = [
  { code: "F", label: "Perempuan", swatch: "bg-chart-1" },
  { code: "M", label: "Laki-laki", swatch: "bg-chart-2" },
  { code: "U", label: "Tidak diketahui", swatch: "bg-chart-5" },
] as const;

const regionNames = new Intl.DisplayNames(["id"], { type: "region" });
function countryName(code: string) {
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

type Row = Audience["demographics"][number];

function pick(rows: Row[], metric: Row["metric"], type: Row["type"]) {
  return rows.filter((r) => r.metric === metric && r.type === type);
}

function ageSort(a: string, b: string) {
  return Number.parseInt(a, 10) - Number.parseInt(b, 10);
}

export default async function AudiensPage() {
  const data = await getAudience();
  const rows = data.demographics;

  const cities = pick(rows, "follower_demographics", "city");
  const countries = pick(rows, "follower_demographics", "country");
  const ageGender = pick(rows, "follower_demographics", "age_gender");
  const engagedAgeGender = pick(rows, "engaged_audience_demographics", "age_gender");

  const capturedDate = [cities, countries, ageGender].flat()[0]?.captured_date ?? null;
  const breakdownTotal = ageGender.reduce((s, r) => s + r.count, 0);

  const ageTotals = new Map<string, number>();
  const genderTotals = new Map<string, number>();
  for (const r of ageGender) {
    const [age, gender] = r.value.split("|");
    ageTotals.set(age, (ageTotals.get(age) ?? 0) + r.count);
    genderTotals.set(gender, (genderTotals.get(gender) ?? 0) + r.count);
  }
  const ages = [...ageTotals.keys()].sort(ageSort);
  const topAge = [...ageTotals.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  const countryTotal = countries.reduce((s, r) => s + r.count, 0);
  const cityMax = cities[0]?.count ?? 1;

  return (
    <BlurFade>
      <div className="flex flex-col gap-6">
        <PageIntro
          title="Audiens"
          stats={[
            { label: "Follower", value: fmtCompact(data.followers_total), icon: UsersThreeIcon, title: `${fmtInt(data.followers_total)} follower` },
            { label: "Kota teratas", value: cities[0] ? cities[0].value.split(",")[0] : "Belum ada", icon: MapPinIcon, title: cities[0]?.value },
            { label: "Umur terbanyak", value: topAge?.[0] ?? "Belum ada", icon: UserIcon },
          ]}
          subtitle={
            capturedDate
              ? `Demografi follower per ${fmtYmd(capturedDate)}. Meta hanya memberi kondisi terkini, bukan riwayat, jadi halaman ini tidak dipengaruhi rentang tanggal.`
              : "Demografi follower dari Meta."
          }
        />

        {rows.length === 0 ? (
          <EmptyState title="Data demografi belum tersedia">
            Demografi diambil oleh sinkron harian (sekitar pukul 07.20 WIB). Jika setelah itu masih kosong, cek log sinkron
            di Supabase (tabel ig.sync_logs).
          </EmptyState>
        ) : (
          <>
            {/* Baris sorotan */}
            <section aria-label="Sorotan audiens" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[1.1fr_1fr_1fr]">
              <div className="relative isolate flex min-h-80 flex-col justify-end overflow-hidden rounded-card p-6 text-white shadow-ink md:col-span-2 xl:col-span-1">
                <Image
                  src="/brand/foto-1.jpg"
                  alt="Karyawan PTPN di lingkungan kerja"
                  fill
                  sizes="(min-width: 1280px) 30vw, (min-width: 768px) 70vw, 100vw"
                  className="-z-10 object-cover object-[50%_30%]"
                  priority
                />
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0f1a12]/90 via-[#0f1a12]/35 to-transparent" aria-hidden />
                <p className="text-body-sm font-medium text-white/80">Total follower @lifeatptpn</p>
                <p className="text-display leading-none font-bold tracking-tight tabular-nums">{fmtInt(data.followers_total)}</p>
                <p className="mt-2 text-body-sm text-white/80">
                  {fmtInt(breakdownTotal)} di antaranya dirinci umur dan gender oleh Meta.
                </p>
              </div>

              <GenderCard totals={genderTotals} total={breakdownTotal} />

              <div className="flex min-h-80 flex-col rounded-card border border-border/70 bg-card/85 p-6 shadow-card">
                <h2 className="text-lead font-bold tracking-tight">Kelompok umur</h2>
                {topAge ? (
                  <>
                    <p className="mt-3 text-kpi leading-none font-bold tracking-tight tabular-nums">{topAge[0]}</p>
                    <p className="mt-1 text-body-sm text-muted-foreground">
                      tahun, {fmtPct(topAge[1] / (breakdownTotal || 1), 1)} follower yang dirinci
                    </p>
                    <ul className="mt-auto flex h-36 items-end gap-[2px] pt-6" aria-label="Porsi follower per kelompok umur">
                      {ages.map((age) => {
                        const v = ageTotals.get(age) ?? 0;
                        const hi = age === topAge[0];
                        return (
                          <li key={age} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                            <span className="flex w-full min-h-0 flex-1 items-end justify-center">
                              <span
                                className={cn("block w-full max-w-9 rounded-t-[4px]", hi ? "bg-brand-orange" : "bg-chart-1")}
                                style={{ height: `${Math.max(2, (v / topAge[1]) * 100)}%` }}
                                title={`${age}: ${fmtInt(v)} follower`}
                              />
                            </span>
                            {/* Kolom sempit: tulis umur awal saja ("25" untuk 25-34); rentang lengkap ada di judul & tooltip. */}
                            <span className={cn("text-caption tabular-nums", hi ? "font-bold" : "text-muted-foreground")} aria-hidden>
                              {age.endsWith("+") ? age : age.split("-")[0]}
                            </span>
                            <span className="sr-only">
                              {age}: {fmtInt(v)} follower
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                ) : (
                  <p className="mt-auto text-body-sm text-muted-foreground">Meta belum mengirim rincian umur.</p>
                )}
              </div>
            </section>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Piramida umur dan gender</CardTitle>
                  <CardDescription>
                    Perempuan di kiri, laki-laki di kanan. {fmtInt(genderTotals.get("U") ?? 0)} follower tanpa data gender tidak
                    masuk piramida, tetapi tetap ada di tabel.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {ageGender.length ? <Pyramid rows={ageGender} /> : <EmptyState title="Belum ada rincian umur dan gender" />}
                </CardContent>
              </Card>

              <section aria-labelledby="kota-title" className="ink-glow flex flex-col rounded-card p-6 text-ink-foreground shadow-ink">
                <h2 id="kota-title" className="text-lead font-bold tracking-tight">
                  Kota teratas
                </h2>
                <p className="text-caption text-ink-muted">10 dari 45 kota yang dirinci Meta</p>
                {cities[0] ? (
                  <>
                    <div className="mt-5 flex items-end justify-between gap-4 rounded-tile bg-white/8 p-4">
                      <div className="min-w-0">
                        <p className="text-caption text-ink-muted">Peringkat 1</p>
                        <p className="text-h4 leading-tight font-bold tracking-tight">{cities[0].value.split(",")[0]}</p>
                        <p className="text-caption text-ink-muted">{cities[0].value.split(",").slice(1).join(",").trim()}</p>
                      </div>
                      <p className="shrink-0 text-h5 font-bold text-brand-orange tabular-nums">{fmtInt(cities[0].count)}</p>
                    </div>
                    <ol start={2} className="mt-4 flex flex-col gap-3">
                      {cities.slice(1, 10).map((c, i) => {
                        const [city, ...region] = c.value.split(",");
                        return (
                          <li key={c.value} className="grid grid-cols-[1.5rem_minmax(0,1fr)_4rem] items-center gap-3">
                            <span className="text-caption font-bold text-ink-muted tabular-nums">{i + 2}</span>
                            <div className="min-w-0">
                              <p className="flex items-baseline gap-2 text-body-sm">
                                <span className="font-semibold">{city}</span>
                                <span className="truncate text-caption text-ink-muted">{region.join(",").trim()}</span>
                              </p>
                              <span className="mt-1 block h-1.5 rounded-full bg-brand-green" style={{ width: `${Math.max(2, (c.count / cityMax) * 100)}%` }} aria-hidden />
                            </div>
                            <span className="text-right text-body-sm font-bold tabular-nums">{fmtInt(c.count)}</span>
                          </li>
                        );
                      })}
                    </ol>
                  </>
                ) : (
                  <p className="mt-5 text-body-sm text-ink-muted">Meta belum mengirim data kota.</p>
                )}
              </section>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GlobeHemisphereEastIcon className="size-5 text-brand-blue" weight="fill" aria-hidden />
                    Negara
                  </CardTitle>
                  <CardDescription>Persentase dari {fmtInt(countryTotal)} follower yang negaranya diketahui.</CardDescription>
                </CardHeader>
                <CardContent>
                  {countries[0] ? (
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <p className="text-kpi leading-none font-bold tracking-tight tabular-nums">{fmtPct(countries[0].count / (countryTotal || 1), 1)}</p>
                          <p className="mt-1 text-body-sm text-muted-foreground">
                            dari {countryName(countries[0].value)} ({fmtInt(countries[0].count)} follower)
                          </p>
                        </div>
                        <p className="text-body-sm text-muted-foreground">{countries.length} negara tercatat</p>
                      </div>
                      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-3">
                        {countries.slice(1, 7).map((c) => (
                          <li key={c.value} className="flex items-center justify-between gap-2 rounded-tile bg-muted/60 px-3 py-2.5">
                            <span className="min-w-0 text-body-sm font-medium">
                              {countryName(c.value)}
                            </span>
                            <span className="text-body-sm font-bold tabular-nums">{fmtInt(c.count)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <EmptyState title="Belum ada data negara" />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Audiens yang berinteraksi</CardTitle>
                  <CardDescription>Umur dan gender akun yang berinteraksi dalam 30 hari terakhir.</CardDescription>
                </CardHeader>
                <CardContent>
                  {engagedAgeGender.length ? (
                    <Pyramid rows={engagedAgeGender} />
                  ) : (
                    <EmptyState title="Meta belum mengirim data ini">
                      Untuk akun ini Meta mengembalikan rincian kosong. Biasanya karena jumlah akun yang berinteraksi di
                      tiap kelompok terlalu kecil untuk ditampilkan demi privasi. Sinkron harian akan terus mencoba.
                    </EmptyState>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Jam follower sedang online</CardTitle>
                <CardDescription>
                  Rata-rata per jam WIB
                  {data.online_range ? `, ${fmtYmd(data.online_range.from)} s.d. ${fmtYmd(data.online_range.to)}` : ""}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.online_followers.length ? (
                  <HourColumns data={data.online_followers} valueLabel="Rata-rata follower online" />
                ) : (
                  <EmptyState title="Belum ada data jam online" />
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </BlurFade>
  );
}

/**
 * Komposisi gender: satu bar 100% bertumpuk (bagian dari keseluruhan, 3 segmen),
 * celah 2px antar segmen, angka ditulis di legenda (bukan di dalam segmen
 * yang bisa terlalu sempit).
 */
function GenderCard({ totals, total }: { totals: Map<string, number>; total: number }) {
  const parts = GENDER.map((g) => ({ ...g, value: totals.get(g.code) ?? 0 })).filter((g) => g.value > 0);
  const f = totals.get("F") ?? 0;
  const m = totals.get("M") ?? 0;
  const known = f + m;
  return (
    <div className="flex min-h-80 flex-col rounded-card border border-border/70 bg-card/85 p-6 shadow-card">
      <h2 className="text-lead font-bold tracking-tight">Gender</h2>
      {total > 0 ? (
        <>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <p className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
                <GenderFemaleIcon className="size-4" weight="bold" aria-hidden /> Perempuan
              </p>
              <p className="text-kpi leading-none font-bold tracking-tight tabular-nums">{fmtPct(known ? f / known : null, 0)}</p>
            </div>
            <div className="text-right">
              <p className="flex items-center justify-end gap-1.5 text-body-sm text-muted-foreground">
                Laki-laki <GenderMaleIcon className="size-4" weight="bold" aria-hidden />
              </p>
              <p className="text-kpi leading-none font-bold tracking-tight tabular-nums">{fmtPct(known ? m / known : null, 0)}</p>
            </div>
          </div>
          <p className="mt-2 text-caption text-muted-foreground">Persen di atas dari follower yang gendernya diketahui.</p>
          <div className="mt-auto flex flex-col gap-3 pt-6">
            <div className="flex h-4 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={parts.map((p) => `${p.label} ${fmtPct(p.value / total, 1)}`).join(", ")}>
              {parts.map((p) => (
                <span key={p.code} className={p.swatch} style={{ flexGrow: p.value, flexBasis: 0 }} />
              ))}
            </div>
            <ul className="flex flex-col gap-1.5">
              {parts.map((p) => (
                <li key={p.code} className="flex items-center justify-between gap-3 text-body-sm">
                  <span className="flex items-center gap-2">
                    <span className={cn("size-3 rounded-[3px]", p.swatch)} aria-hidden />
                    {p.label}
                  </span>
                  <span className="tabular-nums">
                    <span className="font-bold">{fmtInt(p.value)}</span>
                    <span className="text-muted-foreground"> ({fmtPct(p.value / total, 1)})</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <p className="mt-auto text-body-sm text-muted-foreground">Meta belum mengirim rincian gender.</p>
      )}
    </div>
  );
}

/**
 * Piramida umur (butterfly): perempuan ke kiri, laki-laki ke kanan, satu skala
 * untuk kedua sisi supaya panjang bisa dibandingkan. Label tengah = kelompok
 * umur + porsi dari semua follower yang dirinci. Angka persis per sel ada di
 * tabel (termasuk gender tidak diketahui).
 */
function Pyramid({ rows }: { rows: Row[] }) {
  const byAge = new Map<string, Record<string, number>>();
  for (const r of rows) {
    const [age, gender] = r.value.split("|");
    const entry = byAge.get(age) ?? {};
    entry[gender] = (entry[gender] ?? 0) + r.count;
    byAge.set(age, entry);
  }
  const ages = [...byAge.keys()].sort(ageSort).reverse();
  const grand = rows.reduce((s, r) => s + r.count, 0);
  const max = Math.max(1, ...ages.flatMap((a) => [byAge.get(a)!.F ?? 0, byAge.get(a)!.M ?? 0]));
  const tableAges = [...ages].reverse();

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[1fr_5.5rem_1fr] text-caption text-muted-foreground">
        <span className="flex items-center justify-end gap-1.5">
          Perempuan <span className="size-3 rounded-[3px] bg-chart-1" aria-hidden />
        </span>
        <span />
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-[3px] bg-chart-2" aria-hidden /> Laki-laki
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {ages.map((age) => {
          const e = byAge.get(age)!;
          const total = Object.values(e).reduce((s, v) => s + v, 0);
          const fv = e.F ?? 0;
          const mv = e.M ?? 0;
          return (
            <li key={age} className="grid grid-cols-[1fr_5.5rem_1fr] items-center">
              <div className="flex h-7 justify-end">
                <span
                  className="block h-full rounded-l-[4px] bg-chart-1"
                  style={{ width: `${(fv / max) * 100}%`, minWidth: fv ? 2 : 0 }}
                  title={`${age}, Perempuan: ${fmtInt(fv)}`}
                />
              </div>
              <div className="flex flex-col items-center px-1 leading-tight">
                <span className="text-body-sm font-bold tabular-nums">{age}</span>
                <span className="text-caption text-muted-foreground tabular-nums">{fmtPct(total / (grand || 1), 1)}</span>
              </div>
              <div className="flex h-7">
                <span
                  className="block h-full rounded-r-[4px] bg-chart-2"
                  style={{ width: `${(mv / max) * 100}%`, minWidth: mv ? 2 : 0 }}
                  title={`${age}, Laki-laki: ${fmtInt(mv)}`}
                />
              </div>
              <span className="sr-only">
                {age}: perempuan {fmtInt(fv)}, laki-laki {fmtInt(mv)}, tidak diketahui {fmtInt(e.U ?? 0)}
              </span>
            </li>
          );
        })}
      </ul>
      <details className="no-print text-body-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Lihat sebagai tabel</summary>
        <div className="relative mt-2 overflow-x-auto rounded-tile border">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b text-left text-caption text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Umur</th>
                {GENDER.map((g) => (
                  <th key={g.code} className="px-3 py-2 text-right font-semibold">{g.label}</th>
                ))}
                <th className="px-3 py-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {tableAges.map((age) => {
                const e = byAge.get(age)!;
                return (
                  <tr key={age} className="border-b last:border-0">
                    <td className="px-3 py-1.5 tabular-nums">{age}</td>
                    {GENDER.map((g) => (
                      <td key={g.code} className="px-3 py-1.5 text-right tabular-nums">
                        {fmtInt(e[g.code] ?? 0)}
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-right font-semibold tabular-nums">
                      {fmtInt(Object.values(e).reduce((s, v) => s + v, 0))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
