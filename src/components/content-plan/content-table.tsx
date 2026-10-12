"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import { ArrowSquareOutIcon, CheckCircleIcon, CircleHalfIcon, CircleIcon, PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { PostThumb } from "@/components/post-thumb";
import { deleteContentAction, setStageAction, setStatusAction, type FormState } from "@/app/rencana/actions";
import {
  nextStageValue,
  RUBRIK_LABEL,
  STAGE_LABEL,
  STAGE_VALUE_LABEL,
  STAGES,
  STATUSES,
  type CpItem,
  type Stage,
  type StageValue,
} from "@/lib/content-plan";
import { cn } from "@/lib/utils";
import { ContentFormDialog } from "./content-form-dialog";
import { FORMAT_ICON, FormatLabel, PicLabel, PillarChip, PlanDate, StatusBadge } from "./bits";

const IDLE: FormState = { status: "idle" };

type Flash = { tone: "ok" | "error"; text: string } | null;

/** Tombol "Buat Konten" berdiri sendiri: dipasang di kepala halaman. */
export function CreateContentButton({ defaultDate, pics }: { defaultDate: string; pics: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon aria-hidden /> Buat Konten
      </Button>
      {open ? <ContentFormDialog item={null} defaultDate={defaultDate} pics={pics} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function StageIcon({ value }: { value: StageValue }) {
  // Tiga bentuk berbeda, bukan hanya tiga warna: tetap terbaca tanpa warna.
  if (value === "selesai") return <CheckCircleIcon className="size-6 text-brand-green-strong" weight="fill" aria-hidden />;
  if (value === "proses") return <CircleHalfIcon className="size-6 text-brand-blue" weight="fill" aria-hidden />;
  return <CircleIcon className="size-6 text-muted-foreground/60" aria-hidden />;
}

function StageCell({ item, stage, canEdit, onError }: { item: CpItem; stage: Stage; canEdit: boolean; onError: (m: string) => void }) {
  const [value, setValue] = useOptimistic(item.stages[stage]);
  const [pending, start] = useTransition();
  const label = `${STAGE_LABEL[stage]}: ${STAGE_VALUE_LABEL[value]}`;

  if (!canEdit) {
    return (
      <span role="img" aria-label={label} title={label} className="inline-flex">
        <StageIcon value={value} />
      </span>
    );
  }

  const next = nextStageValue(value);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          setValue(next); // tampil langsung; dikembalikan otomatis bila server menolak
          const r = await setStageAction(item.id, stage, next);
          if (r.status === "error") onError(r.message ?? "Progres gagal disimpan.");
        })
      }
      aria-label={`${label}. Ubah ke ${STAGE_VALUE_LABEL[next]}`}
      title={`${label}. Klik untuk mengubah ke ${STAGE_VALUE_LABEL[next]}`}
      className="inline-flex size-9 items-center justify-center rounded-full outline-hidden transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-95 disabled:opacity-60"
    >
      <StageIcon value={value} />
    </button>
  );
}

function DeleteRowButton({ item, onDone }: { item: CpItem; onDone: (f: Flash) => void }) {
  const [, action, pending] = useActionState(async (prev: FormState, form: FormData) => {
    const r = await deleteContentAction(prev, form);
    onDone({ tone: r.status === "ok" ? "ok" : "error", text: r.message ?? "" });
    return r;
  }, IDLE);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Hapus "${item.title}"? Tindakan ini tidak bisa dibatalkan.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="konfirmasi" value="ya" />
      <button
        type="submit"
        disabled={pending}
        aria-label={`Hapus ${item.title}`}
        title="Hapus"
        className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground outline-hidden hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <TrashIcon className="size-4" aria-hidden />
      </button>
    </form>
  );
}

export function ContentTable({
  items,
  canEdit,
  pics,
  today,
  empty,
}: {
  items: CpItem[];
  canEdit: boolean;
  pics: string[];
  today: string;
  /** Tampilan kosong dari halaman (pesannya beda untuk "belum ada" vs "tidak cocok filter"). */
  empty: React.ReactNode;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<CpItem | null>(null);
  const [flash, setFlash] = useState<Flash>(null);

  // Pilihan hanya untuk baris yang masih tampil (filter bisa berubah).
  const visible = new Set(items.map((i) => i.id));
  const chosen = [...selected].filter((id) => visible.has(id));
  const allOn = items.length > 0 && chosen.length === items.length;

  const [, statusAction, statusPending] = useActionState(async (prev: FormState, form: FormData) => {
    const r = await setStatusAction(prev, form);
    setFlash({ tone: r.status === "ok" ? "ok" : "error", text: r.message ?? "" });
    if (r.status === "ok") setSelected(new Set());
    return r;
  }, IDLE);

  const [, bulkDeleteAction, bulkDeleting] = useActionState(async (prev: FormState, form: FormData) => {
    const r = await deleteContentAction(prev, form);
    setFlash({ tone: r.status === "ok" ? "ok" : "error", text: r.message ?? "" });
    if (r.status === "ok") setSelected(new Set());
    return r;
  }, IDLE);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="flex flex-col gap-3">
      {flash?.text ? (
        <p
          role={flash.tone === "error" ? "alert" : "status"}
          className={cn(
            "rounded-tile px-4 py-2.5 text-body-sm",
            flash.tone === "error" ? "bg-destructive/10 text-destructive" : "bg-brand-green-soft text-brand-green-strong"
          )}
        >
          {flash.text}
        </p>
      ) : null}

      {canEdit && chosen.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-tile border border-border/70 bg-muted/50 px-3 py-2.5" role="region" aria-label="Aksi untuk konten terpilih">
          <span className="text-body-sm font-semibold tabular-nums">{chosen.length} dipilih</span>
          <form action={statusAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="ids" value={chosen.join(",")} />
            <label htmlFor="bulk-status" className="sr-only">
              Status baru
            </label>
            <select
              id="bulk-status"
              name="status"
              defaultValue=""
              required
              className="h-9 rounded-full border border-input bg-card px-3 text-body-sm outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="" disabled>
                Ubah status ke…
              </option>
              {STATUSES.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.label}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm" variant="outline" disabled={statusPending}>
              {statusPending ? "Menyimpan…" : "Terapkan"}
            </Button>
          </form>
          <form
            action={bulkDeleteAction}
            onSubmit={(e) => {
              if (!window.confirm(`Hapus ${chosen.length} konten terpilih? Tindakan ini tidak bisa dibatalkan.`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="ids" value={chosen.join(",")} />
            <input type="hidden" name="konfirmasi" value="ya" />
            <Button type="submit" size="sm" variant="outline" disabled={bulkDeleting} className="text-destructive">
              <TrashIcon aria-hidden /> {bulkDeleting ? "Menghapus…" : "Hapus"}
            </Button>
          </form>
          <Button type="button" size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Batal pilih
          </Button>
        </div>
      ) : null}

      {items.length === 0 ? (
        empty
      ) : (
        <div className="relative overflow-x-auto rounded-tile border border-border/70">
          <table className="w-full min-w-[78rem] text-body-sm">
            <caption className="sr-only">Daftar rencana konten</caption>
            <thead className="bg-ink text-ink-foreground">
              <tr className="text-left text-caption">
                {canEdit ? (
                  <th scope="col" rowSpan={2} className="w-12 py-3 pl-4">
                    <input
                      type="checkbox"
                      checked={allOn}
                      onChange={() => setSelected(allOn ? new Set() : new Set(items.map((i) => i.id)))}
                      aria-label={allOn ? "Batalkan pilih semua" : "Pilih semua konten di tabel"}
                      className="size-4 accent-brand-green"
                    />
                  </th>
                ) : null}
                <th scope="col" rowSpan={2} className={cn("py-3 pr-3 font-semibold", canEdit ? "pl-2" : "pl-4")}>
                  Tanggal
                </th>
                <th scope="col" rowSpan={2} className="px-3 py-3 font-semibold">
                  Judul / Topik Konten
                </th>
                <th scope="col" rowSpan={2} className="px-3 py-3 font-semibold">
                  Pillar Content
                </th>
                <th scope="col" rowSpan={2} className="px-3 py-3 font-semibold">
                  Rubrik
                </th>
                <th scope="col" rowSpan={2} className="px-3 py-3 font-semibold">
                  Format
                </th>
                <th scope="colgroup" colSpan={4} className="border-b border-white/15 px-3 pt-3 pb-1.5 text-center font-semibold">
                  Progres Produksi
                </th>
                <th scope="col" rowSpan={2} className="px-3 py-3 font-semibold">
                  Status
                </th>
                <th scope="col" rowSpan={2} className="px-3 py-3 font-semibold">
                  PIC
                </th>
                <th scope="col" rowSpan={2} className="py-3 pr-4 pl-3 text-right font-semibold">
                  Aksi
                </th>
              </tr>
              <tr className="text-caption">
                {STAGES.map((s) => (
                  <th key={s.slug} scope="col" className="px-1 pt-1.5 pb-3 text-center font-medium text-ink-muted">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const on = selected.has(it.id);
                const FIcon = FORMAT_ICON[it.format];
                return (
                  <tr key={it.id} className={cn("border-b border-border/60 align-middle last:border-0 hover:bg-accent/40", on && "bg-brand-green-soft/40")}>
                    {canEdit ? (
                      <td className="py-3 pl-4">
                        <input type="checkbox" checked={on} onChange={() => toggle(it.id)} aria-label={`Pilih ${it.title}`} className="size-4 accent-brand-green" />
                      </td>
                    ) : null}
                    <td className={cn("py-3 pr-3", canEdit ? "pl-2" : "pl-4")}>
                      <PlanDate ymd={it.planned_on} overdue={it.overdue} />
                    </td>
                    <td className="max-w-[22rem] px-3 py-3">
                      <div className="flex items-center gap-3">
                        {it.media ? (
                          <a href={it.media.permalink ?? undefined} target="_blank" rel="noopener noreferrer" className="shrink-0" aria-label={`Buka post Instagram ${it.title} (tab baru)`}>
                            <PostThumb src={it.media.thumb_url} alt="" className="size-12 rounded-tile" />
                          </a>
                        ) : (
                          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-tile bg-muted text-muted-foreground" title="Belum terhubung ke post Instagram">
                            <FIcon className="size-5" aria-hidden />
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="leading-snug font-semibold break-words">{it.title}</p>
                          {it.summary ? <p className="line-clamp-2 text-caption text-muted-foreground" title={it.summary}>{it.summary}</p> : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <PillarChip pillar={it.pillar} />
                    </td>
                    <td className="max-w-[11rem] px-3 py-3">
                      {it.rubrik ? <span className="break-words">{RUBRIK_LABEL[it.rubrik]}</span> : <span className="text-caption text-muted-foreground">Tanpa rubrik</span>}
                    </td>
                    <td className="px-3 py-3">
                      <FormatLabel format={it.format} />
                    </td>
                    {STAGES.map((s) => (
                      <td key={s.slug} className="px-1 py-3 text-center">
                        <StageCell item={it} stage={s.slug} canEdit={canEdit} onError={(m) => setFlash({ tone: "error", text: m })} />
                      </td>
                    ))}
                    <td className="px-3 py-3">
                      <StatusBadge status={it.status} overdue={it.overdue} />
                    </td>
                    <td className="max-w-[11rem] px-3 py-3">
                      <PicLabel name={it.pic} />
                    </td>
                    <td className="py-3 pr-4 pl-3">
                      <div className="flex items-center justify-end gap-0.5">
                        {it.media?.permalink ? (
                          <a
                            href={it.media.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Lihat post ${it.title} di Instagram (tab baru)`}
                            title="Lihat di Instagram"
                            className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                          >
                            <ArrowSquareOutIcon className="size-4" aria-hidden />
                          </a>
                        ) : null}
                        {canEdit ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setEditing(it)}
                              aria-label={`Ubah ${it.title}`}
                              title="Ubah"
                              className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground outline-hidden hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <PencilSimpleIcon className="size-4" aria-hidden />
                            </button>
                            <DeleteRowButton item={it} onDone={setFlash} />
                          </>
                        ) : null}
                        {!canEdit && !it.media?.permalink ? <span className="text-caption text-muted-foreground">Tidak ada</span> : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing ? (
        <ContentFormDialog
          item={editing}
          defaultDate={today}
          pics={pics}
          onClose={() => setEditing(null)}
          onSaved={(m) => setFlash({ tone: "ok", text: m })}
        />
      ) : null}
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
