"use server";

import { revalidatePath } from "next/cache";

import { assertUnlocked } from "@/lib/plan-auth";
import { btbDeleteItem, btbDeleteProgram, btbSaveItem, btbSaveProgram } from "@/lib/being-the-best-data";
import { isBtbStatus, isSectionKey, ITEM_CODE, mondayOf, PROGRAM_CODE } from "@/lib/being-the-best";
import { DataError } from "@/lib/supabase-server";

/**
 * Aksi tulis halaman Being the Best. PIN-nya SAMA dengan Content Plan
 * (PLAN_EDIT_PIN, cookie rencana_edit berlaku untuk seluruh situs), jadi buka
 * kunci di salah satu halaman berlaku di keduanya.
 *
 * Setiap aksi: cek kunci PIN dulu, lalu validasi ulang SEMUA isian di server
 * (skill-analysis §9.6). Constraint tabel adalah pengaman terakhir.
 */

export type BtbFormState = { status: "idle" | "ok" | "error"; message?: string };

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function str(form: FormData, name: string) {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
}

const fail = (message: string): BtbFormState => ({ status: "error", message });

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
  if (/btb_programs_pkey|duplicate key.*btb_programs/i.test(d)) return "Kode program itu sudah dipakai. Pakai kode lain.";
  if (/btb_items_code_uniq/i.test(d)) return "Kode itu sudah dipakai aktivitas lain. Pakai kode lain.";
  if (/Program .* belum ada/i.test(d)) return "Program untuk kode itu belum ada. Kode harus diawali kode program yang sudah ada (mis. A1.5).";
  if (/tidak ditemukan/i.test(d)) return "Data ini sudah tidak ada (mungkin dihapus di perangkat lain). Muat ulang halaman.";
  if (/btb_items_dates/i.test(d)) return "Tanggal End tidak boleh lebih awal dari Start.";
  if (/btb_items_code_fmt|btb_programs_code_fmt/i.test(d)) return "Format kode tidak valid.";
  if (/ig_btb_|schema cache|PGRST202|does not exist/i.test(d)) {
    return "Tabel Being the Best belum ada di database. Jalankan migrasi 20261112100000 dan 20261112100100 dulu.";
  }
  // Bukan e.userMessage: pesan bawaan rpc() berbunyi "Gagal memuat ...", sedangkan ini aksi simpan/hapus.
  return fallback;
}

async function locked(): Promise<BtbFormState | null> {
  try {
    await assertUnlocked();
    return null;
  } catch {
    return fail("Mode edit terkunci. Masukkan PIN dulu.");
  }
}

const refresh = () => revalidatePath("/being-the-best");

export async function saveProgramAction(_prev: BtbFormState, form: FormData): Promise<BtbFormState> {
  const denied = await locked();
  if (denied) return denied;

  const isNew = str(form, "is_new") === "1";
  const code = str(form, "code").toUpperCase();
  if (!PROGRAM_CODE.test(code)) return fail("Kode program harus satu huruf diikuti angka, mis. A6 atau B6.");

  const section = str(form, "section");
  if (!isSectionKey(section)) return fail("Pilih bagian: Above the Line atau Below the Line.");

  const name = str(form, "name");
  if (!name) return fail("Nama program wajib diisi.");
  if (name.length > 200) return fail("Nama program maksimal 200 karakter.");

  const dueRaw = str(form, "due");
  if (dueRaw && !validDate(dueRaw)) return fail("Tanggal due tidak valid.");
  // Due disimpan sebagai Senin minggunya; label W3 Nov '26 dihitung dari tanggal itu.
  const dueWeek = dueRaw ? mondayOf(dueRaw) : null;

  try {
    await btbSaveProgram({ code, isNew, section, name, dueWeek });
    refresh();
    return { status: "ok", message: isNew ? `Program ${code} ditambahkan.` : "Perubahan program tersimpan." };
  } catch (e) {
    return fail(dbMessage(e, "Program gagal disimpan. Coba lagi."));
  }
}

export async function deleteProgramAction(_prev: BtbFormState, form: FormData): Promise<BtbFormState> {
  const denied = await locked();
  if (denied) return denied;
  // Hapus wajib membawa penanda konfirmasi: tidak bisa dipicu hanya dengan memanggil action tanpa isi.
  if (str(form, "konfirmasi") !== "ya") return fail("Konfirmasi penghapusan tidak lengkap.");
  const code = str(form, "code").toUpperCase();
  if (!PROGRAM_CODE.test(code)) return fail("Program tidak dikenal.");
  try {
    const r = await btbDeleteProgram(code);
    refresh();
    return r.deleted > 0
      ? { status: "ok", message: `Program ${code} dan ${r.items} baris di dalamnya dihapus.` }
      : fail("Program sudah tidak ada (mungkin dihapus di perangkat lain).");
  } catch (e) {
    return fail(dbMessage(e, "Program gagal dihapus. Coba lagi."));
  }
}

export async function saveItemAction(_prev: BtbFormState, form: FormData): Promise<BtbFormState> {
  const denied = await locked();
  if (denied) return denied;

  const id = str(form, "id");
  if (id && !UUID.test(id)) return fail("Aktivitas tidak dikenal.");

  const kind = str(form, "kind");
  if (kind !== "activity" && kind !== "group") return fail("Jenis baris tidak dikenal.");

  const code = str(form, "code").toUpperCase();
  if (!ITEM_CODE.test(code)) return fail("Kode harus diawali kode program lalu nomor, mis. A1.5 atau A3.1.2.");

  const name = str(form, "name");
  if (!name) return fail(kind === "group" ? "Nama kelompok wajib diisi." : "Nama aktivitas wajib diisi.");
  if (name.length > 300) return fail("Nama maksimal 300 karakter.");

  const note = str(form, "note");
  if (note.length > 1000) return fail("Keterangan maksimal 1.000 karakter.");

  let status: string | null = null;
  let pic: string | null = null;
  let start: string | null = null;
  let end: string | null = null;
  if (kind === "activity") {
    const s = str(form, "status");
    if (!isBtbStatus(s)) return fail("Pilih status: Not Started, On Progress, atau Done.");
    status = s;
    pic = str(form, "pic") || null;
    if (pic && pic.length > 60) return fail("Nama PIC maksimal 60 karakter.");
    start = str(form, "start");
    end = str(form, "end");
    if (!validDate(start)) return fail("Tanggal Start tidak valid.");
    if (!validDate(end)) return fail("Tanggal End tidak valid.");
    if (end < start) return fail("Tanggal End tidak boleh lebih awal dari Start.");
  }

  try {
    await btbSaveItem({ id: id || null, kind, code, name, status, pic, start, end, note: note || null });
    refresh();
    return { status: "ok", message: id ? `${code} tersimpan.` : `${code} ditambahkan.` };
  } catch (e) {
    return fail(dbMessage(e, "Gagal menyimpan. Coba lagi."));
  }
}

export async function deleteItemAction(_prev: BtbFormState, form: FormData): Promise<BtbFormState> {
  const denied = await locked();
  if (denied) return denied;
  if (str(form, "konfirmasi") !== "ya") return fail("Konfirmasi penghapusan tidak lengkap.");
  const id = str(form, "id");
  if (!UUID.test(id)) return fail("Aktivitas tidak dikenal.");
  try {
    const r = await btbDeleteItem(id);
    refresh();
    return r.deleted > 0 ? { status: "ok", message: "Baris dihapus." } : fail("Baris sudah tidak ada (mungkin dihapus di perangkat lain).");
  } catch (e) {
    return fail(dbMessage(e, "Gagal menghapus. Coba lagi."));
  }
}

// Dibuat oleh Faiz Hazim Hawari · skill-analysis
