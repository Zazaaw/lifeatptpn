"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  NotePencilIcon,
  PlusIcon,
  ProhibitIcon,
  TrashIcon,
  UserIcon,
  XIcon,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlanChip } from "@/components/plan/plan-chip";
import { deleteEventAction, saveEventAction, type FormState } from "@/app/rencana/actions";
import { fmtCompact, fmtInt } from "@/lib/format";
import { KIND_LABEL } from "@/lib/kinds";
import {
  PLAN_STATUS_LABEL,
  PLAN_STATUSES,
  PLAN_TYPE_HINT,
  PLAN_TYPE_LABEL,
  PLAN_TYPES,
  type PlanEvent,
  type PlanPost,
  type PlanStatus,
} from "@/lib/plan-types";
import { cn } from "@/lib/utils";

const IDLE: FormState = { status: "idle" };

function hhmm(h: number, m: number) {
  return `${String(h).padStart(2, "0")}.${String(m).padStart(2, "0")}`;
}

function timeValue(iso: string) {
  // Jam WIB dari instant, tanpa bergantung zona waktu browser.
  const d = new Date(new Date(iso).getTime() + 7 * 3600_000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function dateValue(iso: string) {
  return new Date(new Date(iso).getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

const STATUS_STYLE: Record<PlanStatus, string> = {
  rencana: "bg-muted text-muted-foreground",
  selesai: "bg-brand-green-soft text-brand-green-strong",
  batal: "bg-destructive/10 text-destructive",
};

/**
 * Detail satu tanggal: daftar acara, postingan yang benar-benar terbit pada
 * tanggal itu, dan form tambah/ubah. Form hanya muncul bila mode edit terbuka;
 * server tetap menolak tulisan tanpa PIN, apa pun yang tampil di layar.
 */
export function DayPanel({
  date,
  dateLabel,
  events,
  posts,
  canEdit,
  detailQuery,
}: {
  date: string;
  dateLabel: string;
  events: PlanEvent[];
  posts: PlanPost[];
  canEdit: boolean;
  detailQuery: string;
}) {
  // Halaman memberi key={date}, jadi ganti tanggal mengosongkan state ini
  // tanpa effect tambahan (isian tidak terbawa ke hari lain).
  const [editing, setEditing] = useState<PlanEvent | "new" | null>(null);

  return (
    <section aria-label={`Acara ${dateLabel}`} className="flex flex-col gap-4 rounded-card border border-border/70 bg-card/85 p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lead font-bold tracking-tight">{dateLabel}</h2>
          <p className="text-caption text-muted-foreground">
            {events.length ? `${events.length} acara` : "Belum ada acara"}
            {posts.length ? `, ${posts.length} postingan terbit` : ""}
          </p>
        </div>
        {canEdit && editing !== "new" ? (
          <Button size="sm" onClick={() => setEditing("new")}>
            <PlusIcon aria-hidden /> Tambah acara
          </Button>
        ) : null}
      </div>

      {editing === "new" ? <EventForm date={date} onClose={() => setEditing(null)} /> : null}

      {events.length === 0 && editing !== "new" ? (
        <div className="rounded-tile border border-dashed border-border px-4 py-6">
          <p className="text-body font-bold">Tidak ada acara pada tanggal ini</p>
          <p className="mt-1 text-body-sm text-muted-foreground">
            {canEdit
              ? "Klik Tambah acara untuk menuliskan rencana shooting, posting, atau tenggat."
              : "Buka kunci dengan PIN untuk menambahkan rencana."}
          </p>
        </div>
      ) : null}

      <ul className="flex flex-col gap-3">
        {events.map((e) =>
          editing !== "new" && typeof editing === "object" && editing?.id === e.id ? (
            <li key={e.id}>
              <EventForm date={date} event={e} onClose={() => setEditing(null)} />
            </li>
          ) : (
            <li key={e.id} className="flex flex-col gap-2 rounded-tile border border-border/70 bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <PlanChip type={e.event_type} />
                    <span className={cn("rounded-full px-2 py-0.5 text-caption font-semibold", STATUS_STYLE[e.status])}>
                      {PLAN_STATUS_LABEL[e.status]}
                    </span>
                    {e.is_sample ? (
                      <span className="rounded-full bg-brand-orange-soft px-2 py-0.5 text-caption font-semibold text-foreground">Contoh</span>
                    ) : null}
                  </div>
                  <p className={cn("text-body font-bold", e.status === "batal" && "line-through")}>{e.title}</p>
                </div>
                {canEdit ? (
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => setEditing(e)}>
                      <NotePencilIcon aria-hidden /> Ubah
                    </Button>
                    <DeleteButton id={e.id} title={e.title} />
                  </div>
                ) : null}
              </div>

              <dl className="flex flex-wrap gap-x-5 gap-y-1.5 text-body-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <dt className="sr-only">Waktu</dt>
                  <ClockIcon className="size-4" aria-hidden />
                  <dd className="tabular-nums">
                    {e.all_day
                      ? "Seharian"
                      : e.ends_at
                        ? `${hhmm(e.hour, e.minute)} s.d. ${timeValue(e.ends_at).replace(":", ".")} WIB`
                        : `${hhmm(e.hour, e.minute)} WIB`}
                  </dd>
                </div>
                {e.location ? (
                  <div className="flex items-center gap-1.5">
                    <dt className="sr-only">Lokasi</dt>
                    <MapPinIcon className="size-4" aria-hidden />
                    <dd>{e.location}</dd>
                  </div>
                ) : null}
                {e.owner ? (
                  <div className="flex items-center gap-1.5">
                    <dt className="sr-only">Penanggung jawab</dt>
                    <UserIcon className="size-4" aria-hidden />
                    <dd>{e.owner}</dd>
                  </div>
                ) : null}
              </dl>

              {e.description ? (
                <p className="rounded-tile bg-muted/60 p-3 text-body-sm whitespace-pre-line">{e.description}</p>
              ) : null}
            </li>
          )
        )}
      </ul>

      {posts.length ? (
        <div className="flex flex-col gap-2 border-t border-border/60 pt-4">
          <h3 className="text-body-sm font-bold">Terbit di Instagram pada tanggal ini</h3>
          <ul className="flex flex-col gap-2">
            {posts.map((p) => (
              <li key={p.id}>
                <Link
                  href={detailQuery ? `/konten/${p.id}?${detailQuery}` : `/konten/${p.id}`}
                  className="flex items-center justify-between gap-3 rounded-tile bg-muted/50 px-3 py-2 text-body-sm hover:bg-accent"
                >
                  <span className="min-w-0">
                    <span className="line-clamp-1 font-medium">{p.caption?.trim() || "Tanpa caption"}</span>
                    <span className="text-caption text-muted-foreground tabular-nums">
                      {KIND_LABEL[p.content_kind as keyof typeof KIND_LABEL] ?? p.content_kind}, {hhmm(p.hour, p.minute)} WIB
                    </span>
                  </span>
                  <span className="shrink-0 text-body-sm font-bold tabular-nums" title={`${fmtInt(p.views)} views`}>
                    {fmtCompact(p.views)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function DeleteButton({ id, title }: { id: string; title: string }) {
  const [state, action, pending] = useActionState(deleteEventAction, IDLE);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Hapus acara "${title}"? Tindakan ini tidak bisa dibatalkan.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="outline" size="sm" disabled={pending} aria-label={`Hapus ${title}`}>
        <TrashIcon aria-hidden /> {pending ? "Menghapus…" : "Hapus"}
      </Button>
      {state.status === "error" ? (
        <span role="alert" className="block text-caption text-destructive">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}

function EventForm({ date, event, onClose }: { date: string; event?: PlanEvent; onClose: () => void }) {
  const [state, action, pending] = useActionState(saveEventAction, IDLE);
  const [allDay, setAllDay] = useState(event?.all_day ?? false);

  // Tutup form setelah tersimpan; daftar acara di bawahnya sudah diperbarui server.
  useEffect(() => {
    if (state.status === "ok") onClose();
  }, [state, onClose]);

  const startTime = event && !event.all_day ? timeValue(event.starts_at) : "09:00";
  const endTime = event?.ends_at && !event.all_day ? timeValue(event.ends_at) : "";
  const endDate = event?.ends_at ? dateValue(event.ends_at) : date;

  return (
    <form action={action} className="flex flex-col gap-4 rounded-tile border border-border/70 bg-muted/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-body font-bold">{event ? "Ubah acara" : "Acara baru"}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          <XIcon aria-hidden /> Tutup
        </Button>
      </div>

      {event ? <input type="hidden" name="id" value={event.id} /> : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-body-sm font-medium">
          Judul acara
        </label>
        <Input id="title" name="title" defaultValue={event?.title ?? ""} maxLength={120} required placeholder="mis. Shooting profil karyawan kebun" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="event_type" className="text-body-sm font-medium">
            Jenis
          </label>
          <select
            id="event_type"
            name="event_type"
            defaultValue={event?.event_type ?? "posting"}
            className="h-10 rounded-full border border-input bg-card px-4 text-body md:text-body-sm outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            {PLAN_TYPES.map((t) => (
              <option key={t} value={t}>
                {PLAN_TYPE_LABEL[t]} — {PLAN_TYPE_HINT[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className="text-body-sm font-medium">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={event?.status ?? "rencana"}
            className="h-10 rounded-full border border-input bg-card px-4 text-body md:text-body-sm outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            {PLAN_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PLAN_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-body-sm">
        <input
          type="checkbox"
          name="all_day"
          checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
          className="size-4 accent-[hsl(var(--brand-green-strong))]"
        />
        Acara seharian (tanpa jam)
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="date" className="text-body-sm font-medium">
            Tanggal mulai
          </label>
          <Input id="date" name="date" type="date" defaultValue={event ? event.date : date} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="end_date" className="text-body-sm font-medium">
            Tanggal selesai
          </label>
          <Input id="end_date" name="end_date" type="date" defaultValue={endDate} />
        </div>
        {!allDay ? (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="start_time" className="text-body-sm font-medium">
                Jam mulai (WIB)
              </label>
              <Input id="start_time" name="start_time" type="time" defaultValue={startTime} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="end_time" className="text-body-sm font-medium">
                Jam selesai (boleh kosong)
              </label>
              <Input id="end_time" name="end_time" type="time" defaultValue={endTime} />
            </div>
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="location" className="text-body-sm font-medium">
            Lokasi (opsional)
          </label>
          <Input id="location" name="location" defaultValue={event?.location ?? ""} maxLength={120} placeholder="mis. Kebun Sei Putih" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="owner" className="text-body-sm font-medium">
            Penanggung jawab (opsional)
          </label>
          <Input id="owner" name="owner" defaultValue={event?.owner ?? ""} maxLength={60} placeholder="mis. Tim Produksi" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-body-sm font-medium">
          Deskripsi
        </label>
        <textarea
          id="description"
          name="description"
          defaultValue={event?.description ?? ""}
          maxLength={2000}
          rows={4}
          placeholder={"Rincian pekerjaan, kebutuhan alat, atau catatan untuk tim.\nContoh: bawa clip on, siapkan rilis izin narasumber."}
          className="min-h-28 rounded-tile border border-input bg-card px-4 py-3 text-body md:text-body-sm outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="text-caption text-muted-foreground">Maksimal 2.000 karakter.</p>
      </div>

      {state.status === "error" ? (
        <p role="alert" className="flex items-center gap-2 text-body-sm text-destructive">
          <ProhibitIcon className="size-4 shrink-0" aria-hidden />
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          <CheckCircleIcon aria-hidden />
          {pending ? "Menyimpan…" : event ? "Simpan perubahan" : "Simpan acara"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
          Batal
        </Button>
      </div>
    </form>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
