import "server-only";

import { rpc } from "./supabase-server";
import type { BtbList, BtbSectionKey } from "./being-the-best";

/**
 * Akses data Being the Best. Sama seperti Content Plan: semua lewat function
 * public.ig_btb_* yang hanya boleh dieksekusi service_role.
 */

export const getBtb = () => rpc<BtbList>("ig_btb_list", {}, "timeline Being the Best");

export const btbSaveProgram = (i: { code: string; isNew: boolean; section: BtbSectionKey; name: string; dueWeek: string | null }) =>
  rpc<{ code: string }>(
    "ig_btb_save_program",
    { p_code: i.code, p_is_new: i.isNew, p_section: i.section, p_name: i.name, p_due_week: i.dueWeek },
    "program"
  );

export const btbDeleteProgram = (code: string) => rpc<{ deleted: number; items: number }>("ig_btb_delete_program", { p_code: code }, "program");

export type BtbItemInput = {
  id: string | null;
  kind: "activity" | "group";
  code: string;
  name: string;
  status: string | null;
  pic: string | null;
  start: string | null;
  end: string | null;
  note: string | null;
};

export const btbSaveItem = (i: BtbItemInput) =>
  rpc<{ id: string }>(
    "ig_btb_save_item",
    {
      p_id: i.id,
      p_kind: i.kind,
      p_code: i.code,
      p_name: i.name,
      p_status: i.status,
      p_pic: i.pic,
      p_start: i.start,
      p_end: i.end,
      p_note: i.note,
    },
    "aktivitas"
  );

export const btbDeleteItem = (id: string) => rpc<{ deleted: number }>("ig_btb_delete_item", { p_id: id }, "aktivitas");

// Dibuat oleh Faiz Hazim Hawari · skill-analysis
