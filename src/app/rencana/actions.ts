"use server";

import { revalidatePath } from "next/cache";

import { assertUnlocked, lockEditing, unlockWithPin } from "@/lib/plan-auth";
import { cpDelete, cpSetStage, cpSetStatus, cpUpsert, getPostCandidates } from "@/lib/content-plan-data";
import {
  isFormat,
  isPillar,
  isRubrik,
  isStage,
  isStageValue,
  isStatus,
  STAGES,
  type CpCandidate,
  type Stage,
  type StageValue,
} from "@/lib/content-plan";
import { DataError } from "@/lib/supabase-server";

/**
 * Aksi tulis halaman Content Plan (menu Rencana).
 *
 * Setiap aksi: cek kunci PIN dulu, lalu validasi ulang SEMUA isian di server.
 * Form di browser hanya membantu; batas panjang, pilihan pilar/rubrik/format/
 * status/tahap, format tanggal, dan id tetap diperiksa di sini
 * (skill-analysis §9.6). Constraint tabel adalah pengaman terakhir.
 */

export type FormState = { status: "idle" | "ok" | "error"; message?: string; id?: string };

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MEDIA_ID = /^\d{5,30}$/; // id media Instagram selalu angka
const MAX_BULK = 200;

function str(form: FormData, name: string) {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
}

function fail(message: string): FormState {
  return { status: "error", message };
}

/** Tanggal kalender yang benar-benar ada (menolak 2026-02-30). */
function validDate(ymd: string) {
  if (!YMD.test(ymd)) return false;
  const d = new Date(`${ymd}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === ymd && d.getUTCFullYear() >= 2020 && d.getUTCFullYear() <= 2100;
}

/** Pesan database diterjemahkan ke bahasa user; detail teknis tetap di log server. */
function dbMessage(e: unknown, fallback: string) {
  if (!(e instanceof DataError)) return fallback;
  const d = e.detail ?? "";
  if (/content_plan_media_uniq/i.test(d)) return "Post Instagram itu sudah ditautkan ke konten lain. Lepaskan dulu tautan di konten tersebut.";
  if (/Konten tidak ditemukan/i.test(d)) return "Konten ini sudah tidak ada (mungkin dihapus di perangkat lain). Muat ulang halaman.";
  if (/foreign key/i.test(d) && /media/i.test(d)) return "Post Instagram yang dipilih tidak ditemukan. Pilih ulang dari daftar.";
  if (/ig_cp_|schema cache|PGRST202|does not exist/i.test(d)) {
    return "Tabel Content Plan belum ada di database. Jalankan migrasi 20261012090000_ig_content_plan.sql dulu.";
  }
  return e.userMessage || fallback;
}

async function locked(): Promise<FormState | null> {
  try {
    await assertUnlocked();
    return null;
  } catch {
    return fail("Mode edit terkunci. Masukkan PIN dulu.");
  }
}

function refresh() {
  // revalidatePath mengabaikan query string, jadi cukup dua jalur ini.
  revalidatePath("/rencana");
  revalidatePath("/"); // kartu "Rencana terdekat" di Ringkasan ikut diperbarui
}

/** Kumpulan id dari form (field `ids` dipisah koma, atau beberapa field `id`). */
function idsFrom(form: FormData) {
  const raw = [...form.getAll("id"), ...str(form, "ids").split(",")]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
  const ids = [...new Set(raw)];
  return ids.every((x) => UUID.test(x)) ? ids : null;
}

export async function unlockAction(_prev: FormState, form: FormData): Promise<FormState> {
  const pin = str(form, "pin");
  if (!pin) return fail("Masukkan PIN dulu.");
  const result = await unlockWithPin(pin);
  if (!result.ok) return fail(result.message);
  refresh();
  return { status: "ok", message: "Mode edit aktif. Kunci otomatis tertutup 12 jam lagi." };
}

export async function lockAction(): Promise<void> {
  await lockEditing();
  refresh();
}

export async function saveContentAction(_prev: FormState, form: FormData): Promise<FormState> {
  const denied = await locked();
  if (denied) return denied;

  const id = str(form, "id");
  if (id && !UUID.test(id)) return fail("Konten tidak dikenal.");

  const plannedOn = str(form, "planned_on");
  if (!validDate(plannedOn)) return fail("Tanggal tayang tidak valid.");

  const title = str(form, "title");
  if (title.length === 0) return fail("Judul atau topik konten wajib diisi.");
  if (title.length > 140) return fail("Judul maksimal 140 karakter.");

  const summary = str(form, "summary");
  if (summary.length > 300) return fail("Keterangan singkat maksimal 300 karakter.");

  const pillar = str(form, "pillar");
  if (!isPillar(pillar)) return fail("Pilih salah satu dari 8 pilar konten.");

  const rubrikRaw = str(form, "rubrik");
  if (rubrikRaw && !isRubrik(rubrikRaw)) return fail("Rubrik tidak dikenal.");
  const rubrik = isRubrik(rubrikRaw) ? rubrikRaw : null; // kosong = tanpa rubrik

  const format = str(form, "format");
  if (!isFormat(format)) return fail("Format konten tidak dikenal.");

  const status = str(form, "status") || "rencana";
  if (!isStatus(status)) return fail("Status konten tidak dikenal.");

  const stages = {} as Record<Stage, StageValue>;
  for (const s of STAGES) {
    const v = str(form, `stage_${s.slug}`) || "belum";
    if (!isStageValue(v)) return fail(`Progres ${s.label} tidak dikenal.`);
    stages[s.slug] = v;
  }

  const pic = str(form, "pic");
  if (pic.length > 60) return fail("Nama PIC maksimal 60 karakter.");

  const mediaId = str(form, "media_id");
  if (mediaId && !MEDIA_ID.test(mediaId)) return fail("Post Instagram yang dipilih tidak valid.");

  const notes = str(form, "notes");
  if (notes.length > 2000) return fail("Catatan maksimal 2.000 karakter.");

  try {
    const res = await cpUpsert({
      id: id || null,
      planned_on: plannedOn,
      title,
      summary: summary || null,
      pillar,
      rubrik,
      format,
      status,
      stages,
      pic: pic || null,
      media_id: mediaId || null,
      notes: notes || null,
    });
    refresh();
    return { status: "ok", message: id ? "Perubahan tersimpan." : "Konten ditambahkan.", id: res.id };
  } catch (e) {
    return fail(dbMessage(e, "Konten gagal disimpan. Coba lagi."));
  }
}

export async function deleteContentAction(_prev: FormState, form: FormData): Promise<FormState> {
  const denied = await locked();
  if (denied) return denied;
  // Hapus wajib membawa penanda konfirmasi: tidak bisa dipicu hanya dengan
  // memanggil action tanpa isi.
  if (str(form, "konfirmasi") !== "ya") return fail("Konfirmasi penghapusan tidak lengkap.");
  const ids = idsFrom(form);
  if (!ids?.length) return fail("Pilih konten yang akan dihapus.");
  if (ids.length > MAX_BULK) return fail(`Maksimal ${MAX_BULK} konten sekali hapus.`);
  try {
    const res = await cpDelete(ids);
    refresh();
    return res.deleted > 0
      ? { status: "ok", message: `${res.deleted} konten dihapus.` }
      : fail("Konten sudah tidak ada (mungkin dihapus di perangkat lain).");
  } catch (e) {
    return fail(dbMessage(e, "Konten gagal dihapus. Coba lagi."));
  }
}

export async function setStatusAction(_prev: FormState, form: FormData): Promise<FormState> {
  const denied = await locked();
  if (denied) return denied;
  const ids = idsFrom(form);
  if (!ids?.length) return fail("Pilih konten yang statusnya akan diubah.");
  if (ids.length > MAX_BULK) return fail(`Maksimal ${MAX_BULK} konten sekali ubah.`);
  const status = str(form, "status");
  if (!isStatus(status)) return fail("Pilih status baru.");
  try {
    const res = await cpSetStatus(ids, status);
    refresh();
    return { status: "ok", message: `Status ${res.updated} konten diperbarui.` };
  } catch (e) {
    return fail(dbMessage(e, "Status gagal diubah. Coba lagi."));
  }
}

/** Dipanggil langsung dari tombol tahap di tabel (bukan lewat form). */
export async function setStageAction(id: string, stage: string, value: string): Promise<FormState> {
  const denied = await locked();
  if (denied) return denied;
  if (!UUID.test(id)) return fail("Konten tidak dikenal.");
  if (!isStage(stage)) return fail("Tahap produksi tidak dikenal.");
  if (!isStageValue(value)) return fail("Progres tidak dikenal.");
  try {
    const res = await cpSetStage(id, stage, value);
    refresh();
    return res.updated > 0 ? { status: "ok" } : fail("Konten sudah tidak ada. Muat ulang halaman.");
  } catch (e) {
    return fail(dbMessage(e, "Progres gagal disimpan. Coba lagi."));
  }
}

/**
 * Calon post Instagram untuk ditautkan. Hanya membaca data publik (post yang
 * sudah terbit), jadi tidak perlu PIN; tanggal tetap divalidasi.
 */
export async function postCandidatesAction(date: string): Promise<{ items: CpCandidate[]; error?: string }> {
  if (!validDate(date)) return { items: [], error: "Isi tanggal tayang dulu untuk mencari post." };
  try {
    return { items: await getPostCandidates(date, 7) };
  } catch (e) {
    return { items: [], error: dbMessage(e, "Daftar post gagal dimuat. Coba lagi.") };
  }
}

// Dibuat oleh Faiz Hazim Hawari · skill-analysis
