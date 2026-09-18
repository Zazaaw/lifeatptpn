import "server-only";

import { rpc } from "./supabase-server";
import type { PlanRange, PlanStatus, PlanType, PlanUpcoming } from "./plan-types";

/**
 * Akses data rencana konten. Sama seperti data.ts: semua lewat function
 * public.ig_plan_* yang hanya boleh dieksekusi service_role.
 */

export const getPlanRange = (from: string, to: string, type?: PlanType | null) =>
  rpc<PlanRange>("ig_plan_list", { p_from: from, p_to: to, p_type: type ?? null }, "rencana konten");

export const getPlanUpcoming = (limit = 5) =>
  rpc<PlanUpcoming>("ig_plan_upcoming", { p_limit: limit }, "rencana terdekat");

export type PlanInput = {
  id: string | null;
  title: string;
  event_type: PlanType;
  status: PlanStatus;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  description: string | null;
  location: string | null;
  owner: string | null;
};

export const planUpsert = (input: PlanInput) =>
  rpc<{ id: string; date: string; title: string }>(
    "ig_plan_upsert",
    {
      p_id: input.id,
      p_title: input.title,
      p_event_type: input.event_type,
      p_status: input.status,
      p_starts_at: input.starts_at,
      p_ends_at: input.ends_at,
      p_all_day: input.all_day,
      p_description: input.description,
      p_location: input.location,
      p_owner: input.owner,
    },
    "acara"
  );

export const planDelete = (id: string) => rpc<{ deleted: number }>("ig_plan_delete", { p_id: id }, "acara");

export const planDeleteSamples = () => rpc<{ deleted: number }>("ig_plan_delete_samples", {}, "contoh acara");

// Dibuat oleh Faiz Hazim Hawari · skill-analysis
