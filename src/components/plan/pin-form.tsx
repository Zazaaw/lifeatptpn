"use client";

import { useActionState } from "react";
import { LockKeyIcon, LockKeyOpenIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lockAction, unlockAction, type FormState } from "@/app/rencana/actions";

const IDLE: FormState = { status: "idle" };

/**
 * Kunci mode edit. Membaca kalender tidak perlu PIN; menambah, mengubah, dan
 * menghapus perlu. PIN diperiksa di server dan tidak pernah dikirim balik ke
 * browser (lihat src/lib/plan-auth.ts).
 */
export function PinForm({ unlocked, configured }: { unlocked: boolean; configured: boolean }) {
  const [state, action, pending] = useActionState(unlockAction, IDLE);

  if (!configured) {
    return (
      <p className="flex items-center gap-2 text-caption text-muted-foreground">
        <LockKeyIcon className="size-4 shrink-0" aria-hidden />
        Jadwal belum bisa diubah dari web: isi PLAN_EDIT_PIN di environment server.
      </p>
    );
  }

  if (unlocked) {
    return (
      <form action={lockAction} className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-green-soft px-3 py-1 text-caption font-semibold text-brand-green-strong">
          <LockKeyOpenIcon className="size-4" weight="bold" aria-hidden />
          Mode edit aktif
        </span>
        <Button type="submit" variant="outline" size="sm">
          Kunci lagi
        </Button>
      </form>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="pin" className="text-caption font-medium text-muted-foreground">
          PIN untuk mengubah jadwal
        </label>
        <Input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          className="w-44"
          placeholder="PIN tim"
          aria-describedby={state.status === "error" ? "pin-error" : undefined}
        />
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        <LockKeyIcon aria-hidden /> {pending ? "Memeriksa…" : "Buka kunci"}
      </Button>
      {state.status === "error" ? (
        <p id="pin-error" role="alert" className="w-full text-caption text-destructive">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
