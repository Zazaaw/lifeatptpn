"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { ArrowSquareOutIcon, LinkBreakIcon, MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PostThumb } from "@/components/post-thumb";
import { deleteContentAction, postCandidatesAction, saveContentAction, type FormState } from "@/app/rencana/actions";
import {
  FORMATS,
  PILLARS,
  RUBRIK_LABEL,
  RUBRIKS,
  STAGE_VALUES,
  STAGES,
  STATUSES,
  type CpCandidate,
  type CpItem,
  type CpMedia,
  type Rubrik,
  type Stage,
  type StageValue,
  type Status,
} from "@/lib/content-plan";
import { kindLabel } from "@/lib/kinds";
import { cn } from "@/lib/utils";

const IDLE: FormState = { status: "idle" };
const SELECT =
  "h-10 w-full rounded-full border border-input bg-card px-4 text-body md:text-body-sm shadow-sm outline-hidden focus-visible:ring-2 focus-visible:ring-ring";
const POSTED = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });


/**
 * Tambah atau ubah satu konten. Lewat portal ke <body>: pembungkus halaman
 * (BlurFade) memakai transform yang mengurung elemen fixed.
 *
 * Validasi di sini hanya membantu (required, maxLength). Server action
 * memeriksa ulang semuanya dan menolak bila mode edit terkunci.
 */
export function ContentFormDialog({
  item,
  defaultDate,
  pics,
  onClose,
  onSaved,
}: {
  item: CpItem | null;
  defaultDate: string;
  pics: string[];
  onClose: () => void;
  onSaved?: (message: string) => void;
}) {
  const editing = Boolean(item);
  const [plannedOn, setPlannedOn] = useState(item?.planned_on ?? defaultDate);
  const [status, setStatus] = useState<Status>(item?.status ?? "rencana");
  const [rubrik, setRubrik] = useState<Rubrik | "">(item?.rubrik ?? "");
  const [stages, setStages] = useState<Record<Stage, StageValue>>(
    item?.stages ?? { script: "belum", editing: "belum", review: "belum", upload: "belum" }
  );
  const [linked, setLinked] = useState<CpMedia | null>(item?.media ?? null);
  const [autoNote, setAutoNote] = useState<string | null>(null);

  const [cands, setCands] = useState<CpCandidate[] | null>(null);
  const [candError, setCandError] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();

  // Simpan sukses: tutup dialog dari dalam action (bukan dari effect).
  const [state, action, pending] = useActionState(async (prev: FormState, form: FormData) => {
    const r = await saveContentAction(prev, form);
    if (r.status === "ok") {
      onSaved?.(r.message ?? "Tersimpan.");
      onClose();
    }
    return r;
  }, IDLE);

  const [delState, delAction, deleting] = useActionState(async (prev: FormState, form: FormData) => {
    const r = await deleteContentAction(prev, form);
    if (r.status === "ok") {
      onSaved?.(r.message ?? "Konten dihapus.");
      onClose();
    }
    return r;
  }, IDLE);

  // Escape menutup dialog, kecuali sedang menyimpan.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending && !deleting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending, deleting]);

  function findPosts() {
    startSearch(async () => {
      const r = await postCandidatesAction(plannedOn);
      setCands(r.items);
      setCandError(r.error ?? null);
    });
  }

  function pick(c: CpCandidate) {
    setLinked({ id: c.id, permalink: c.permalink, posted_at: c.posted_at, content_kind: c.content_kind, thumb_url: c.thumb_url });
    const changes: string[] = [];
    if (!rubrik && c.rubrik) {
      setRubrik(c.rubrik);
      changes.push(`rubrik ${RUBRIK_LABEL[c.rubrik]} (dari hashtag)`);
    }
    if (status !== "published") {
      setStatus("published");
      changes.push("status Published");
    }
    if (stages.upload !== "selesai") {
      setStages((s) => ({ ...s, upload: "selesai" }));
      changes.push("tahap Upload selesai");
    }
    // Perubahan otomatis diberitahukan, tidak diam-diam: user bisa mengubahnya lagi.
    setAutoNote(changes.length ? `Post sudah terbit, jadi diisi otomatis: ${changes.join(", ")}. Ubah lagi bila perlu.` : null);
    setCands(null);
  }

  const busy = pending || deleting;
  const error = state.status === "error" ? state.message : delState.status === "error" ? delState.message : null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="cp-dialog-title">
      <div className="absolute inset-0 bg-foreground/40" onClick={() => !busy && onClose()} aria-hidden />
      <div className="relative flex max-h-[100dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-card bg-card shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-card">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4 md:px-6">
          <div className="min-w-0">
            <h2 id="cp-dialog-title" className="text-lead font-bold tracking-tight">
              {editing ? "Ubah konten" : "Buat konten"}
            </h2>
            <p className="text-caption text-muted-foreground">Kolom bertanda * wajib diisi.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Tutup"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-accent disabled:opacity-50"
          >
            <XIcon className="size-4" aria-hidden />
          </button>
        </div>

        <form action={action} className="flex min-h-0 flex-1 flex-col">
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto px-5 py-5 md:grid-cols-2 md:px-6">
            {item ? <input type="hidden" name="id" value={item.id} /> : null}
            <input type="hidden" name="media_id" value={linked?.id ?? ""} />
            <input type="hidden" name="status" value={status} />
            <input type="hidden" name="rubrik" value={rubrik} />
            {STAGES.map((s) => (
              <input key={s.slug} type="hidden" name={`stage_${s.slug}`} value={stages[s.slug]} />
            ))}

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label htmlFor="cp-title" className="text-body-sm font-medium">
                Judul atau topik *
              </label>
              <Input id="cp-title" name="title" defaultValue={item?.title ?? ""} maxLength={140} required autoFocus placeholder="mis. Shooting profil karyawan kebun" />
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label htmlFor="cp-summary" className="text-body-sm font-medium">
                Keterangan singkat
              </label>
              <Input id="cp-summary" name="summary" defaultValue={item?.summary ?? ""} maxLength={300} placeholder="mis. Cerita inspiratif dari lapangan" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="cp-date" className="text-body-sm font-medium">
                Tanggal tayang *
              </label>
              <Input id="cp-date" name="planned_on" type="date" value={plannedOn} onChange={(e) => setPlannedOn(e.target.value)} required />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="cp-format" className="text-body-sm font-medium">
                Format *
              </label>
              <select id="cp-format" name="format" defaultValue={item?.format ?? "reels"} required className={SELECT}>
                {FORMATS.map((f) => (
                  <option key={f.slug} value={f.slug}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="cp-pillar" className="text-body-sm font-medium">
                Pillar content *
              </label>
              <select id="cp-pillar" name="pillar" defaultValue={item?.pillar ?? ""} required className={SELECT}>
                <option value="" disabled>
                  Pilih pilar
                </option>
                {PILLARS.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.label} ({p.tagline})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="cp-rubrik" className="text-body-sm font-medium">
                Rubrik
              </label>
              <select id="cp-rubrik" value={rubrik} onChange={(e) => setRubrik(e.target.value as Rubrik | "")} className={SELECT}>
                <option value="">Tanpa rubrik</option>
                {RUBRIKS.map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="cp-status" className="text-body-sm font-medium">
                Status
              </label>
              <select id="cp-status" value={status} onChange={(e) => setStatus(e.target.value as Status)} className={SELECT}>
                {STATUSES.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="cp-pic" className="text-body-sm font-medium">
                PIC
              </label>
              <Input id="cp-pic" name="pic" defaultValue={item?.pic ?? ""} maxLength={60} list="cp-pic-list" placeholder="mis. Tim Produksi" autoComplete="off" />
              <datalist id="cp-pic-list">
                {pics.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>

            <fieldset className="flex flex-col gap-2 md:col-span-2">
              <legend className="mb-1 text-body-sm font-medium">Progres produksi</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {STAGES.map((s) => (
                  <div key={s.slug} className="flex items-center justify-between gap-3 rounded-tile border border-border/70 px-3 py-2">
                    <span className="text-body-sm font-medium">{s.label}</span>
                    <div role="radiogroup" aria-label={`Progres ${s.label}`} className="inline-flex rounded-full bg-muted p-0.5">
                      {STAGE_VALUES.map((v) => {
                        const on = stages[s.slug] === v.slug;
                        return (
                          <button
                            key={v.slug}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => setStages((x) => ({ ...x, [s.slug]: v.slug }))}
                            className={cn(
                              "rounded-full px-2.5 py-1 text-caption font-medium transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                              on ? "bg-card font-semibold text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {v.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-col gap-2 md:col-span-2">
              <span className="text-body-sm font-medium">Post Instagram terkait</span>
              {linked ? (
                <div className="flex items-center gap-3 rounded-tile border border-border/70 p-2.5">
                  <PostThumb src={linked.thumb_url} alt="Thumbnail post terkait" className="size-14 shrink-0 rounded-tile" />
                  <div className="min-w-0 flex-1 text-body-sm">
                    <p className="font-semibold">
                      {kindLabel(linked.content_kind)}, terbit {POSTED.format(new Date(linked.posted_at))} WIB
                    </p>
                    {linked.permalink ? (
                      <a href={linked.permalink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-caption font-medium underline underline-offset-2">
                        Buka di Instagram <ArrowSquareOutIcon className="size-3.5" aria-hidden />
                        <span className="sr-only">(tab baru)</span>
                      </a>
                    ) : null}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setLinked(null)}>
                    <LinkBreakIcon aria-hidden /> Lepas
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={findPosts} disabled={searching || !plannedOn}>
                    <MagnifyingGlassIcon aria-hidden /> {searching ? "Mencari…" : "Cari post sekitar tanggal tayang"}
                  </Button>
                  <p className="text-caption text-muted-foreground">Post yang terbit 7 hari sebelum atau sesudah tanggal tayang.</p>
                </div>
              )}
              {candError ? (
                <p role="alert" className="text-caption text-destructive">
                  {candError}
                </p>
              ) : null}
              {cands && !linked ? (
                cands.length ? (
                  <ul className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto rounded-tile border border-border/70 p-2 sm:grid-cols-2">
                    {cands.map((c) => {
                      const taken = Boolean(c.linked_plan_id && c.linked_plan_id !== item?.id);
                      return (
                        <li key={c.id}>
                          <button
                            type="button"
                            disabled={taken}
                            onClick={() => pick(c)}
                            className="flex w-full items-start gap-2.5 rounded-tile p-2 text-left transition-colors outline-hidden hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <PostThumb src={c.thumb_url} alt="" className="size-12 shrink-0 rounded-tile" />
                            <span className="min-w-0 text-caption">
                              <span className="block font-semibold text-foreground">
                                {kindLabel(c.content_kind)}, {POSTED.format(new Date(c.posted_at))}
                                {c.days_off === 0 ? " (hari yang sama)" : ` (selisih ${c.days_off} hari)`}
                              </span>
                              <span className="line-clamp-2 text-muted-foreground">{c.caption || "Tanpa caption"}</span>
                              {taken ? <span className="block font-semibold text-foreground">Sudah ditautkan ke konten lain</span> : null}
                              {!taken && c.rubrik ? <span className="block text-brand-green-strong">#{c.rubrik}</span> : null}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-caption text-muted-foreground">Tidak ada post Instagram dalam 7 hari di sekitar tanggal itu.</p>
                )
              ) : null}
              {autoNote ? (
                <p role="status" className="rounded-tile bg-brand-orange-soft px-3 py-2 text-caption">
                  {autoNote}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label htmlFor="cp-notes" className="text-body-sm font-medium">
                Catatan
              </label>
              <textarea
                id="cp-notes"
                name="notes"
                defaultValue={item?.notes ?? ""}
                maxLength={2000}
                rows={3}
                placeholder="Kebutuhan alat, narasumber, atau catatan untuk tim."
                className="min-h-24 rounded-tile border border-input bg-card px-4 py-3 text-body shadow-sm outline-hidden placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring md:text-body-sm"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border/60 px-5 py-4 md:px-6">
            {error ? (
              <p role="alert" className="text-body-sm text-destructive">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                {item ? (
                  <Button
                    type="submit"
                    formAction={delAction}
                    formNoValidate
                    variant="outline"
                    disabled={busy}
                    onClick={(e) => {
                      if (!window.confirm(`Hapus "${item.title}"? Tindakan ini tidak bisa dibatalkan.`)) e.preventDefault();
                    }}
                    name="konfirmasi"
                    value="ya"
                    className="text-destructive"
                  >
                    {deleting ? "Menghapus…" : "Hapus konten"}
                  </Button>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                  Batal
                </Button>
                <Button type="submit" disabled={busy}>
                  {pending ? "Menyimpan…" : editing ? "Simpan perubahan" : "Simpan konten"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
