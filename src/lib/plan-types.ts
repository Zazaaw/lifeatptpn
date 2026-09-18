/**
 * Jenis acara, status, dan bentuk data rencana konten.
 * Modul murni (tanpa akses database) supaya bisa dipakai di server maupun di
 * form yang berjalan di browser.
 */

export const PLAN_TYPES = ["shooting", "posting", "event", "deadline", "riset", "editing", "meeting", "libur"] as const;
export type PlanType = (typeof PLAN_TYPES)[number];

export const PLAN_STATUSES = ["rencana", "selesai", "batal"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const PLAN_TYPE_LABEL: Record<PlanType, string> = {
  shooting: "Shooting",
  posting: "Posting",
  event: "Event",
  deadline: "Deadline",
  riset: "Riset",
  editing: "Editing",
  meeting: "Meeting",
  libur: "Libur",
};

/** Satu kalimat penjelas di form, supaya tim memilih jenis yang sama artinya. */
export const PLAN_TYPE_HINT: Record<PlanType, string> = {
  shooting: "Pengambilan gambar atau video di lapangan",
  posting: "Jadwal unggah ke Instagram",
  event: "Acara atau kegiatan yang diliput",
  deadline: "Batas waktu penyerahan",
  riset: "Cari ide, referensi, atau data",
  editing: "Proses edit foto, video, atau caption",
  meeting: "Rapat atau koordinasi tim",
  libur: "Hari libur, cuti, atau tidak ada produksi",
};

/**
 * Warna tetap per jenis (mengikuti entitas, bukan urutan). Nilai token ada di
 * globals.css dan lolos dataviz/validate_palette.js untuk mode terang & gelap.
 */
export const PLAN_SWATCH: Record<PlanType, string> = {
  shooting: "bg-plan-shooting",
  posting: "bg-plan-posting",
  event: "bg-plan-event",
  deadline: "bg-plan-deadline",
  riset: "bg-plan-riset",
  editing: "bg-plan-editing",
  meeting: "bg-plan-meeting",
  libur: "bg-plan-libur",
};

/**
 * Warna teks DI ATAS warna jenis. Semua pasangan dihitung dan >= 4,5:1:
 * terang: shooting 5,9 | posting 6,2 | event 4,8 | deadline 5,2 | riset 6,7 |
 *         editing 6,2 | meeting 6,3 | libur 5,1
 * gelap : semuanya memakai teks gelap, 4,6 sampai 5,4
 */
export const PLAN_ON_FILL: Record<PlanType, string> = {
  shooting: "text-white dark:text-[#101a12]",
  posting: "text-white dark:text-[#101a12]",
  event: "text-[#101a12]",
  deadline: "text-white dark:text-[#101a12]",
  riset: "text-[#101a12]",
  editing: "text-[#101a12]",
  meeting: "text-white dark:text-[#101a12]",
  libur: "text-white dark:text-[#101a12]",
};

export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  rencana: "Rencana",
  selesai: "Selesai",
  batal: "Batal",
};

export type PlanEvent = {
  id: string;
  title: string;
  event_type: PlanType;
  status: PlanStatus;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  description: string | null;
  location: string | null;
  owner: string | null;
  media_id: string | null;
  is_sample: boolean;
  /** Tanggal WIB mulai dan selesai (YYYY-MM-DD), dihitung di SQL. */
  date: string;
  end_date: string;
  hour: number;
  minute: number;
  updated_at: string;
};

export type PlanPost = {
  id: string;
  content_kind: string;
  caption: string | null;
  posted_at: string;
  date: string;
  hour: number;
  minute: number;
  views: number | null;
};

export type PlanRange = {
  from: string;
  to: string;
  events: PlanEvent[];
  by_type: Partial<Record<PlanType, number>>;
  sample_count: number;
  posts: PlanPost[];
};

export type PlanUpcoming = {
  today: string;
  events: (Pick<PlanEvent, "id" | "title" | "event_type" | "status" | "starts_at" | "all_day" | "location" | "owner" | "description" | "date" | "hour" | "minute">)[];
  count_week: number;
  count_month: number;
  count_overdue: number;
};

export function isPlanType(v: unknown): v is PlanType {
  return typeof v === "string" && (PLAN_TYPES as readonly string[]).includes(v);
}

export function isPlanStatus(v: unknown): v is PlanStatus {
  return typeof v === "string" && (PLAN_STATUSES as readonly string[]).includes(v);
}

// Dibuat oleh Faiz Hazim Hawari · skill-analysis
