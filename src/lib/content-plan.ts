/**
 * Content Plan: daftar tetap pilar, rubrik, format, status, dan tahap produksi.
 *
 * Slug di sini juga dikunci oleh constraint tabel ig.content_plan
 * (supabase/migrations/20261012090000_ig_content_plan.sql). Mengubah salah
 * satu daftar wajib mengubah keduanya, kalau tidak server menolak isian.
 *
 * Modul ini sengaja tanpa `server-only` dan tanpa ikon: dipakai Server
 * Component, Client Component, dan server action sekaligus.
 */

export const PILLARS = [
  { slug: "business_savvy", label: "Business Savvy", tagline: "Unggul & terdepan" },
  { slug: "operational_excellence", label: "Operational Excellence", tagline: "Optimal, cepat, dan efisien" },
  { slug: "risk_culture", label: "Risk Culture", tagline: "Agresif tapi berhati-hati" },
  { slug: "digital_culture", label: "Digital Culture", tagline: "Go Digital!" },
  { slug: "innovation_culture", label: "Innovation Culture", tagline: "Inovasi Tiada henti" },
  { slug: "esg", label: "ESG", tagline: "Bisnis Berkelanjutan" },
  { slug: "humanizing_human", label: "Humanizing Human", tagline: "Sejahtera & Memberi Makna" },
  { slug: "rwp", label: "RWP", tagline: "Respectful Workplace Policy" },
] as const;

/** Rubrik = hashtag yang benar-benar dipakai di caption (#tumbuhdiptpn dst). */
export const RUBRIKS = [
  { slug: "lifeasnusantaraentreplanters", label: "Life as Nusantara EntrePlanters" },
  { slug: "oneweekonetips", label: "One Week One Tips" },
  { slug: "respectfulinclusiveworkplace", label: "Respectful Inclusive Workplace" },
  { slug: "tumbuhdiptpn", label: "Tumbuh di PTPN" },
  { slug: "ceritainovator", label: "Cerita Inovator" },
  { slug: "levelupchangeagent", label: "Level Up Change Agent" },
  { slug: "motivasientreplanters", label: "Motivasi EntrePlanters" },
  { slug: "sipalingculture", label: "Si Paling Culture" },
] as const;

export const FORMATS = [
  { slug: "reels", label: "Reels" },
  { slug: "carousel", label: "Carousel" },
  { slug: "poster", label: "Poster" },
  { slug: "story", label: "Story" },
  { slug: "video", label: "Video" },
] as const;

export const STATUSES = [
  { slug: "rencana", label: "Rencana" },
  { slug: "produksi", label: "Produksi" },
  { slug: "editing", label: "Editing" },
  { slug: "review", label: "Review" },
  { slug: "published", label: "Published" },
] as const;

export const STAGES = [
  { slug: "script", label: "Script" },
  { slug: "editing", label: "Editing" },
  { slug: "review", label: "Review" },
  { slug: "upload", label: "Upload" },
] as const;

export const STAGE_VALUES = [
  { slug: "belum", label: "Belum" },
  { slug: "proses", label: "Proses" },
  { slug: "selesai", label: "Selesai" },
] as const;

export type Pillar = (typeof PILLARS)[number]["slug"];
export type Rubrik = (typeof RUBRIKS)[number]["slug"];
export type Format = (typeof FORMATS)[number]["slug"];
export type Status = (typeof STATUSES)[number]["slug"];
export type Stage = (typeof STAGES)[number]["slug"];
export type StageValue = (typeof STAGE_VALUES)[number]["slug"];
/** Filter status punya satu nilai turunan: lewat tanggal tayang tapi belum published. */
export type StatusFilter = Status | "overdue";

const has = <T extends { slug: string }>(list: readonly T[]) => {
  const set = new Set(list.map((x) => x.slug));
  return (v: unknown): v is T["slug"] => typeof v === "string" && set.has(v);
};

export const isPillar = has(PILLARS);
export const isRubrik = has(RUBRIKS);
export const isFormat = has(FORMATS);
export const isStatus = has(STATUSES);
export const isStage = has(STAGES);
export const isStageValue = has(STAGE_VALUES);
export const isStatusFilter = (v: unknown): v is StatusFilter => v === "overdue" || isStatus(v);

const labels = <T extends { slug: string; label: string }>(list: readonly T[]) =>
  Object.fromEntries(list.map((x) => [x.slug, x.label])) as Record<T["slug"], string>;

export const PILLAR_LABEL = labels(PILLARS);
export const RUBRIK_LABEL = labels(RUBRIKS);
export const FORMAT_LABEL = labels(FORMATS);
export const STATUS_LABEL = labels(STATUSES);
export const STAGE_LABEL = labels(STAGES);
export const STAGE_VALUE_LABEL = labels(STAGE_VALUES);

/** Klik di tabel: belum -> proses -> selesai -> belum. */
export function nextStageValue(v: StageValue): StageValue {
  return v === "belum" ? "proses" : v === "proses" ? "selesai" : "belum";
}

/*
 * Warna pilar. Hex di --pillar-* (globals.css) divalidasi dengan
 * dataviz/scripts/validate_palette.js pada 12 Okt 2026: semua pasangan
 * BERDAMPINGAN lulus di mode terang dan gelap (CVD dE >= 8,3). Uji semua
 * pasangan gagal (wajar untuk 8 kategori), jadi warna tidak pernah jadi
 * satu-satunya penanda: chip dan kartu selalu memuat nama pilarnya.
 * Kelas ditulis utuh supaya terbaca Tailwind.
 */
export const PILLAR_STYLE: Record<Pillar, { tile: string; chip: string; icon: string; ring: string }> = {
  business_savvy: {
    tile: "bg-pillar-business/10 border-pillar-business/30",
    chip: "bg-pillar-business/12 border-pillar-business/45",
    icon: "text-pillar-business",
    ring: "ring-pillar-business",
  },
  operational_excellence: {
    tile: "bg-pillar-operational/10 border-pillar-operational/30",
    chip: "bg-pillar-operational/12 border-pillar-operational/45",
    icon: "text-pillar-operational",
    ring: "ring-pillar-operational",
  },
  risk_culture: {
    tile: "bg-pillar-risk/10 border-pillar-risk/35",
    chip: "bg-pillar-risk/14 border-pillar-risk/50",
    icon: "text-pillar-risk",
    ring: "ring-pillar-risk",
  },
  digital_culture: {
    tile: "bg-pillar-digital/10 border-pillar-digital/30",
    chip: "bg-pillar-digital/12 border-pillar-digital/45",
    icon: "text-pillar-digital",
    ring: "ring-pillar-digital",
  },
  innovation_culture: {
    tile: "bg-pillar-innovation/10 border-pillar-innovation/30",
    chip: "bg-pillar-innovation/12 border-pillar-innovation/45",
    icon: "text-pillar-innovation",
    ring: "ring-pillar-innovation",
  },
  esg: {
    tile: "bg-pillar-esg/10 border-pillar-esg/35",
    chip: "bg-pillar-esg/14 border-pillar-esg/50",
    icon: "text-pillar-esg",
    ring: "ring-pillar-esg",
  },
  humanizing_human: {
    tile: "bg-pillar-humanizing/10 border-pillar-humanizing/30",
    chip: "bg-pillar-humanizing/12 border-pillar-humanizing/45",
    icon: "text-pillar-humanizing",
    ring: "ring-pillar-humanizing",
  },
  rwp: {
    tile: "bg-pillar-rwp/10 border-pillar-rwp/30",
    chip: "bg-pillar-rwp/12 border-pillar-rwp/45",
    icon: "text-pillar-rwp",
    ring: "ring-pillar-rwp",
  },
};

/** Warna status memakai token brand yang sudah ada; label teks selalu ikut. */
export const STATUS_STYLE: Record<Status, string> = {
  rencana: "bg-muted text-foreground",
  produksi: "bg-brand-blue-soft text-foreground",
  editing: "bg-brand-orange-soft text-foreground",
  review: "bg-ink text-ink-foreground",
  published: "bg-brand-green-soft text-brand-green-strong",
};

// ---------------------------------------------------------------------------
// Bentuk data dari function public.ig_cp_*
// ---------------------------------------------------------------------------
export type CpMedia = {
  id: string;
  permalink: string | null;
  posted_at: string;
  content_kind: string;
  thumb_url: string | null;
};

export type CpItem = {
  id: string;
  planned_on: string;
  title: string;
  summary: string | null;
  pillar: Pillar;
  rubrik: Rubrik | null;
  format: Format;
  status: Status;
  overdue: boolean;
  stages: Record<Stage, StageValue>;
  pic: string | null;
  notes: string | null;
  updated_at: string;
  media: CpMedia | null;
};

export type CpKpi = { total: number; published: number; on_progress: number; review: number; overdue: number };

export type CpList = {
  from: string | null;
  to: string | null;
  today: string;
  kpi: CpKpi;
  by_pillar: Partial<Record<Pillar, number>>;
  by_rubrik: Record<Rubrik, { plan: number; posts: number }>;
  items_total: number;
  limit: number;
  items: CpItem[];
  pics: string[];
};

export type CpUpcoming = {
  today: string;
  open_total: number;
  overdue_total: number;
  items: Pick<CpItem, "id" | "planned_on" | "title" | "pillar" | "format" | "status" | "pic" | "overdue">[];
};

export type CpCandidate = {
  id: string;
  content_kind: string;
  caption: string | null;
  permalink: string | null;
  thumb_url: string | null;
  posted_at: string;
  days_off: number;
  rubrik: Rubrik | null;
  linked_plan_id: string | null;
};

// Dibuat oleh Faiz Hazim Hawari · skill-analysis
