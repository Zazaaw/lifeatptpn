import "server-only";

import { rpc } from "./supabase-server";
import type { CpCandidate, CpList, CpUpcoming, Format, Pillar, Rubrik, Stage, StageValue, Status, StatusFilter } from "./content-plan";

/**
 * Akses data Content Plan. Sama seperti data.ts: semua lewat function
 * public.ig_cp_* yang hanya boleh dieksekusi service_role.
 */

export type CpFilter = {
  from: string | null;
  to: string | null;
  pillar: Pillar | null;
  rubrik: Rubrik | null;
  format: Format | null;
  status: StatusFilter | null;
  q: string | null;
};

export const getContentPlan = (f: CpFilter, limit = 300) =>
  rpc<CpList>(
    "ig_cp_list",
    {
      p_from: f.from,
      p_to: f.to,
      p_pillar: f.pillar,
      p_rubrik: f.rubrik,
      p_format: f.format,
      p_status: f.status,
      p_q: f.q,
      p_limit: limit,
    },
    "content plan"
  );

export const getContentPlanUpcoming = (limit = 5) => rpc<CpUpcoming>("ig_cp_upcoming", { p_limit: limit }, "rencana terdekat");

export const getPostCandidates = (date: string, days = 7) =>
  rpc<CpCandidate[]>("ig_cp_post_candidates", { p_date: date, p_days: days }, "post Instagram");

export type CpInput = {
  id: string | null;
  planned_on: string;
  title: string;
  summary: string | null;
  pillar: Pillar;
  rubrik: Rubrik | null;
  format: Format;
  status: Status;
  stages: Record<Stage, StageValue>;
  pic: string | null;
  media_id: string | null;
  notes: string | null;
};

export const cpUpsert = (i: CpInput) =>
  rpc<{ id: string }>(
    "ig_cp_upsert",
    {
      p_id: i.id,
      p_planned_on: i.planned_on,
      p_title: i.title,
      p_summary: i.summary,
      p_pillar: i.pillar,
      p_rubrik: i.rubrik,
      p_format: i.format,
      p_status: i.status,
      p_stage_script: i.stages.script,
      p_stage_editing: i.stages.editing,
      p_stage_review: i.stages.review,
      p_stage_upload: i.stages.upload,
      p_pic: i.pic,
      p_media_id: i.media_id,
      p_notes: i.notes,
    },
    "konten"
  );

export const cpDelete = (ids: string[]) => rpc<{ deleted: number }>("ig_cp_delete", { p_ids: ids }, "konten");

export const cpSetStatus = (ids: string[], status: Status) =>
  rpc<{ updated: number }>("ig_cp_set_status", { p_ids: ids, p_status: status }, "status konten");

export const cpSetStage = (id: string, stage: Stage, value: StageValue) =>
  rpc<{ updated: number }>("ig_cp_set_stage", { p_id: id, p_stage: stage, p_value: value }, "progres produksi");

// Dibuat oleh Faiz Hazim Hawari · skill-analysis
