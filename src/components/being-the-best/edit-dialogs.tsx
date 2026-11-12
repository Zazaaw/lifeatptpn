"use client";

import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PencilSimpleIcon, PlusIcon, XIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  deleteItemAction,
  deleteProgramAction,
  saveItemAction,
  saveProgramAction,
  type BtbFormState,
} from "@/app/being-the-best/actions";
import {
  BTB_SECTIONS,
  BTB_STATUSES,
  isBtbStatus,
  networkdays,
  weekLabel,
  type BtbItem,
  type BtbProgram,
  type BtbSectionKey,
} from "@/lib/being-the-best";

const IDLE: BtbFormState = { status: "idle" };
const SELECT =
  "h-10 w-full rounded-full border border-input bg-card px-4 text-body md:text-body-sm shadow-sm outline-hidden focus-visible:ring-2 focus-visible:ring-ring";
const TEXTAREA =
  "min-h-20 w-full rounded-tile border border-input bg-card px-4 py-2.5 text-body md:text-body-sm shadow-sm outline-hidden focus-visible:ring-2 focus-visible:ring-ring";
const LABEL = "text-body-sm font-medium";
const HELP = "text-caption text-muted-foreground";

/**
 * Bingkai dialog. Lewat portal ke <body>: pembungkus halaman (BlurFade) memakai
 * transform yang mengurung elemen fixed. Escape dan klik latar menutup, kecuali
 * sedang menyimpan.
 */
function DialogShell({
  title,
  subtitle,
  busy,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  busy: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="btb-dialog-title">
      <div className="absolute inset-0 bg-foreground/40" onClick={() => !busy && onClose()} aria-hidden />
      <div className="relative flex max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-card bg-card shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-card">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4 md:px-6">
          <div className="min-w-0">
            <h2 id="btb-dialog-title" className="text-lead font-bold tracking-tight">
              {title}
            </h2>
            {subtitle ? <p className={HELP}>{subtitle}</p> : null}
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
        {children}
      </div>
    </div>,
    document.body
  );
}

function Footer({
  error,
  busy,
  saving,
  deleting,
  saveLabel,
  deleteLabel,
  deleteForm,
  confirmText,
  onClose,
}: {
  error: string | null;
  busy: boolean;
  saving: boolean;
  deleting: boolean;
  saveLabel: string;
  deleteLabel?: string;
  /** id <form> hapus terpisah (lihat DeleteForm). Kosong = tanpa tombol hapus. */
  deleteForm?: string;
  confirmText?: string;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border/60 px-5 py-4 md:px-6">
      {error ? (
        <p role="alert" className="text-body-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          {deleteForm ? (
            <Button
              type="submit"
              form={deleteForm}
              variant="outline"
              disabled={busy}
              onClick={(e) => {
                if (!window.confirm(confirmText ?? "Hapus? Tindakan ini tidak bisa dibatalkan.")) e.preventDefault();
              }}
              className="text-destructive"
            >
              {deleting ? "Menghapus…" : deleteLabel}
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button type="submit" disabled={busy}>
            {saving ? "Menyimpan…" : saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Form hapus terpisah, di luar form simpan. Dulu tombol hapus memakai
 * formAction + name/value="konfirmasi", tetapi nama/nilai tombol itu tidak ikut
 * terkirim ke server action (ditemukan di uji e2e 12 Nov 2026: hapus selalu
 * ditolak "Konfirmasi penghapusan tidak lengkap"). Input tersembunyi pasti terkirim.
 */
function DeleteForm({ id, action, fields }: { id: string; action: (form: FormData) => void; fields: Record<string, string> }) {
  return (
    <form id={id} action={action} hidden>
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <input type="hidden" name="konfirmasi" value="ya" />
    </form>
  );
}

/** Simpan/hapus yang menutup dialog saat berhasil (dari dalam action, bukan effect). */
function useClosingAction(fn: (prev: BtbFormState, form: FormData) => Promise<BtbFormState>, onClose: () => void) {
  return useActionState(async (prev: BtbFormState, form: FormData) => {
    const r = await fn(prev, form);
    if (r.status === "ok") onClose();
    return r;
  }, IDLE);
}

// ---- aktivitas & judul kelompok ------------------------------------------------------

export type ItemDraft = { kind: "activity" | "group"; code: string; start?: string; pic?: string | null };

function ItemDialog({ item, draft, pics, onClose }: { item: BtbItem | null; draft: ItemDraft; pics: string[]; onClose: () => void }) {
  const kind = item?.kind ?? draft.kind;
  const act = item?.kind === "activity" ? item : null;
  const [start, setStart] = useState(act?.start ?? draft.start ?? "");
  const [end, setEnd] = useState(act?.end ?? draft.start ?? "");
  const [state, action, saving] = useClosingAction(saveItemAction, onClose);
  const [delState, delAction, deleting] = useClosingAction(deleteItemAction, onClose);
  const busy = saving || deleting;
  const error = state.status === "error" ? state.message ?? null : delState.status === "error" ? delState.message ?? null : null;
  const days = start && end && end >= start ? networkdays(start, end) : null;
  const what = kind === "group" ? "judul kelompok" : "aktivitas";

  return (
    <DialogShell
      title={item ? `Ubah ${what} ${item.code}` : `Tambah ${what}`}
      subtitle={kind === "group" ? "Judul kelompok tidak punya tanggal; aktivitas berkode di bawahnya (mis. A3.1.2) tampil menjorok." : "Kolom bertanda * wajib diisi."}
      busy={busy}
      onClose={onClose}
    >
      <form action={action} className="flex min-h-0 flex-1 flex-col">
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto px-5 py-5 sm:grid-cols-[9rem_1fr] md:px-6">
          {item ? <input type="hidden" name="id" value={item.id} /> : null}
          <input type="hidden" name="kind" value={kind} />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="btb-code" className={LABEL}>
              Kode *
            </label>
            <Input id="btb-code" name="code" defaultValue={item?.code ?? draft.code} required maxLength={20} pattern="[A-Za-z][0-9]{1,3}(\.[0-9]{1,3}){1,4}" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="btb-name" className={LABEL}>
              {kind === "group" ? "Nama kelompok *" : "Aktivitas *"}
            </label>
            <Input id="btb-name" name="name" defaultValue={item?.name ?? ""} required maxLength={300} autoFocus />
          </div>
          <p className={cn(HELP, "sm:col-span-2 -mt-2")}>Kode menentukan program dan urutan, seperti di file: A1.5 masuk program A1.</p>

          {kind === "activity" ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="btb-status" className={LABEL}>
                  Status *
                </label>
                <select
                  id="btb-status"
                  name="status"
                  className={SELECT}
                  defaultValue={act && isBtbStatus(act.status) ? act.status : "Not Started"}
                >
                  {BTB_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="btb-pic" className={LABEL}>
                  PIC
                </label>
                <Input id="btb-pic" name="pic" defaultValue={act?.pic ?? draft.pic ?? ""} maxLength={60} list="btb-pics" />
                <datalist id="btb-pics">
                  {pics.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="btb-start" className={LABEL}>
                    Start *
                  </label>
                  <Input id="btb-start" name="start" type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="btb-end" className={LABEL}>
                    End *
                  </label>
                  <Input id="btb-end" name="end" type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} required />
                </div>
                <p className={cn(HELP, "col-span-2")} aria-live="polite">
                  {days !== null ? `Durasi ${days} hari kerja (Senin s.d. Jumat, dihitung otomatis).` : "Durasi dihitung otomatis dari Start dan End."}
                </p>
              </div>
            </>
          ) : null}

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="btb-note" className={LABEL}>
              Keterangan
            </label>
            <textarea id="btb-note" name="note" defaultValue={item?.note ?? ""} maxLength={1000} className={TEXTAREA} />
          </div>
        </div>
        <Footer
          error={error}
          busy={busy}
          saving={saving}
          deleting={deleting}
          saveLabel={item ? "Simpan perubahan" : `Simpan ${what}`}
          deleteLabel={`Hapus ${what}`}
          deleteForm={item ? "btb-del-item" : undefined}
          confirmText={item ? `Hapus ${item.code} "${item.name}"? Tindakan ini tidak bisa dibatalkan.` : undefined}
          onClose={onClose}
        />
      </form>
      {item ? <DeleteForm id="btb-del-item" action={delAction} fields={{ id: item.id }} /> : null}
    </DialogShell>
  );
}

// ---- program ----------------------------------------------------------------------------

function ProgramDialog({
  program,
  draft,
  rows,
  onClose,
}: {
  program: BtbProgram | null;
  draft: { section: BtbSectionKey; code: string };
  rows: number;
  onClose: () => void;
}) {
  const [due, setDue] = useState(program?.dueWeek ?? "");
  const [state, action, saving] = useClosingAction(saveProgramAction, onClose);
  const [delState, delAction, deleting] = useClosingAction(deleteProgramAction, onClose);
  const busy = saving || deleting;
  const error = state.status === "error" ? state.message ?? null : delState.status === "error" ? delState.message ?? null : null;

  return (
    <DialogShell title={program ? `Ubah program ${program.code}` : "Tambah program"} subtitle="Kolom bertanda * wajib diisi." busy={busy} onClose={onClose}>
      <form action={action} className="flex min-h-0 flex-1 flex-col">
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto px-5 py-5 sm:grid-cols-[9rem_1fr] md:px-6">
          <input type="hidden" name="is_new" value={program ? "0" : "1"} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="btb-pcode" className={LABEL}>
              Kode *
            </label>
            {program ? (
              <>
                <input type="hidden" name="code" value={program.code} />
                <Input id="btb-pcode" value={program.code} readOnly disabled />
              </>
            ) : (
              <Input id="btb-pcode" name="code" defaultValue={draft.code} required maxLength={4} pattern="[A-Za-z][0-9]{1,3}" />
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="btb-pname" className={LABEL}>
              Nama program *
            </label>
            <Input id="btb-pname" name="name" defaultValue={program?.name ?? ""} required maxLength={200} autoFocus />
          </div>
          {program ? <p className={cn(HELP, "sm:col-span-2 -mt-2")}>Kode program tidak bisa diubah karena semua kode aktivitasnya berawalan kode ini.</p> : null}

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="btb-section" className={LABEL}>
              Bagian *
            </label>
            <select id="btb-section" name="section" className={SELECT} defaultValue={program?.section ?? draft.section}>
              {BTB_SECTIONS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="btb-due" className={LABEL}>
              Minggu due
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <Input id="btb-due" name="due" type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-48" />
              <span className="text-body-sm font-semibold tabular-nums" aria-live="polite">
                {due ? weekLabel(due) : "Tanpa due"}
              </span>
            </div>
            <p className={HELP}>Pilih tanggal mana saja di minggu itu. Label minggu mengikuti file: W1 = minggu yang Senin-nya paling awal di bulan itu.</p>
          </div>
        </div>
        <Footer
          error={error}
          busy={busy}
          saving={saving}
          deleting={deleting}
          saveLabel={program ? "Simpan perubahan" : "Simpan program"}
          deleteLabel="Hapus program"
          deleteForm={program ? "btb-del-program" : undefined}
          confirmText={program ? `Hapus program ${program.code} beserta ${rows} baris di dalamnya? Tindakan ini tidak bisa dibatalkan.` : undefined}
          onClose={onClose}
        />
      </form>
      {program ? <DeleteForm id="btb-del-program" action={delAction} fields={{ code: program.code }} /> : null}
    </DialogShell>
  );
}

// ---- tombol pemicu ---------------------------------------------------------------------

const ICON_BTN =
  "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring outline-hidden";

export function EditItemButton({ item, pics }: { item: BtbItem; pics: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={ICON_BTN} onClick={() => setOpen(true)} aria-label={`Ubah ${item.code} ${item.name}`} title="Ubah">
        <PencilSimpleIcon className="size-4" aria-hidden />
      </button>
      {open ? <ItemDialog item={item} draft={{ kind: item.kind, code: item.code }} pics={pics} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function AddItemButton({ draft, pics, label }: { draft: ItemDraft; pics: string[]; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-0.5 text-caption font-semibold text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring outline-hidden"
      >
        <PlusIcon className="size-3.5" weight="bold" aria-hidden />
        {label}
      </button>
      {open ? <ItemDialog item={null} draft={draft} pics={pics} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function EditProgramButton({ program, rows }: { program: BtbProgram; rows: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={ICON_BTN} onClick={() => setOpen(true)} aria-label={`Ubah program ${program.code}`} title="Ubah program">
        <PencilSimpleIcon className="size-4" aria-hidden />
      </button>
      {open ? <ProgramDialog program={program} draft={{ section: program.section, code: program.code }} rows={rows} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function AddProgramButton({ draft }: { draft: { section: BtbSectionKey; code: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon aria-hidden /> Tambah program
      </Button>
      {open ? <ProgramDialog program={null} draft={draft} rows={0} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
