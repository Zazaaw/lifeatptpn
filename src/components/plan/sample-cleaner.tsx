"use client";

import { useActionState } from "react";
import { BroomIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { deleteSamplesAction, type FormState } from "@/app/rencana/actions";

const IDLE: FormState = { status: "idle" };

/** Hapus semua acara contoh sekali klik (hanya saat mode edit terbuka). */
export function SampleCleaner({ count, canEdit }: { count: number; canEdit: boolean }) {
  const [state, action, pending] = useActionState(deleteSamplesAction, IDLE);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-caption text-muted-foreground">
        {count} acara berlabel <strong className="font-semibold text-foreground">Contoh</strong> masih ada di kalender.
      </p>
      {canEdit ? (
        <form
          action={action}
          onSubmit={(e) => {
            if (!window.confirm(`Hapus ${count} acara contoh? Acara buatan tim tidak ikut terhapus.`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="konfirmasi" value="ya" />
          <Button type="submit" variant="outline" size="sm" disabled={pending}>
            <BroomIcon aria-hidden /> {pending ? "Menghapus…" : "Hapus semua contoh"}
          </Button>
        </form>
      ) : null}
      {state.message ? (
        <span role="status" className={state.status === "error" ? "text-caption text-destructive" : "text-caption text-muted-foreground"}>
          {state.message}
        </span>
      ) : null}
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
