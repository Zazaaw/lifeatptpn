"use server";

import { revalidatePath } from "next/cache";

import { assertUnlocked, lockEditing, unlockWithPin } from "@/lib/plan-auth";
import { planDelete, planDeleteSamples, planUpsert } from "@/lib/plan";
import { isPlanStatus, isPlanType } from "@/lib/plan-types";
import { DataError } from "@/lib/supabase-server";

/**
 * Aksi tulis halaman Rencana.
 *
 * Setiap aksi: cek kunci PIN dulu, lalu validasi ulang SEMUA isian di server.
 * Form di browser hanya membantu; batas panjang, jenis, status, dan format
 * tanggal tetap diperiksa di sini (skill-analysis §9.6).
 */

export type FormState = { status: "idle" | "ok" | "error"; message?: string; openId?: string };

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const HM = /^\d{2}:\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function str(form: FormData, name: string) {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
}

/** Tanggal + jam WIB menjadi instant. Zona ditulis eksplisit, tidak ikut jam server. */
function wibToIso(date: string, time: string) {
  const iso = new Date(`${date}T${time}:00+07:00`);
  return Number.isNaN(iso.getTime()) ? null : iso.toISOString();
}

function fail(message: string): FormState {
  return { status: "error", message };
}

function refresh() {
  // revalidatePath mengabaikan query string, jadi cukup dua jalur halaman ini.
  revalidatePath("/rencana");
  revalidatePath("/"); // kartu "Rencana terdekat" di Ringkasan ikut diperbarui
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

export async function saveEventAction(_prev: FormState, form: FormData): Promise<FormState> {
  try {
    await assertUnlocked();
  } catch {
    return fail("Mode edit terkunci. Masukkan PIN dulu.");
  }

  const id = str(form, "id");
  if (id && !UUID.test(id)) return fail("Acara tidak dikenal.");

  const title = str(form, "title");
  if (title.length === 0) return fail("Judul acara wajib diisi.");
  if (title.length > 120) return fail("Judul maksimal 120 karakter.");

  const eventType = str(form, "event_type");
  if (!isPlanType(eventType)) return fail("Jenis acara tidak dikenal.");

  const status = str(form, "status") || "rencana";
  if (!isPlanStatus(status)) return fail("Status acara tidak dikenal.");

  const date = str(form, "date");
  if (!YMD.test(date)) return fail("Tanggal tidak valid.");

  const allDay = str(form, "all_day") === "on";
  const startTime = allDay ? "00:00" : str(form, "start_time") || "09:00";
  if (!HM.test(startTime)) return fail("Jam mulai tidak valid.");

  const endDate = str(form, "end_date") || date;
  if (!YMD.test(endDate)) return fail("Tanggal selesai tidak valid.");
  const endTimeRaw = str(form, "end_time");
  const endTime = allDay ? "23:59" : endTimeRaw;
  if (endTime && !HM.test(endTime)) return fail("Jam selesai tidak valid.");

  const startsAt = wibToIso(date, startTime);
  if (!startsAt) return fail("Tanggal atau jam mulai tidak valid.");
  const endsAt = endTime ? wibToIso(endDate, endTime) : null;
  if (endTime && !endsAt) return fail("Tanggal atau jam selesai tidak valid.");
  if (endsAt && endsAt < startsAt) return fail("Waktu selesai lebih awal dari waktu mulai.");

  const description = str(form, "description");
  if (description.length > 2000) return fail("Deskripsi maksimal 2.000 karakter.");
  const location = str(form, "location");
  if (location.length > 120) return fail("Lokasi maksimal 120 karakter.");
  const owner = str(form, "owner");
  if (owner.length > 60) return fail("Penanggung jawab maksimal 60 karakter.");

  try {
    await planUpsert({
      id: id || null,
      title,
      event_type: eventType,
      status,
      starts_at: startsAt,
      ends_at: endsAt,
      all_day: allDay,
      description: description || null,
      location: location || null,
      owner: owner || null,
    });
    refresh();
    return { status: "ok", message: id ? "Perubahan tersimpan." : "Acara ditambahkan." };
  } catch (e) {
    return fail(e instanceof DataError ? e.userMessage : "Acara gagal disimpan. Coba lagi.");
  }
}

export async function deleteEventAction(_prev: FormState, form: FormData): Promise<FormState> {
  try {
    await assertUnlocked();
  } catch {
    return fail("Mode edit terkunci. Masukkan PIN dulu.");
  }
  const id = str(form, "id");
  if (!UUID.test(id)) return fail("Acara tidak dikenal.");
  try {
    const res = await planDelete(id);
    refresh();
    return res.deleted > 0
      ? { status: "ok", message: "Acara dihapus." }
      : fail("Acara sudah tidak ada (mungkin sudah dihapus di perangkat lain).");
  } catch (e) {
    return fail(e instanceof DataError ? e.userMessage : "Acara gagal dihapus. Coba lagi.");
  }
}

export async function deleteSamplesAction(_prev: FormState, form: FormData): Promise<FormState> {
  try {
    await assertUnlocked();
  } catch {
    return fail("Mode edit terkunci. Masukkan PIN dulu.");
  }
  // Hapus massal: form wajib mengirim penanda konfirmasi, tidak bisa dipicu
  // hanya dengan memanggil action tanpa isi.
  if (str(form, "konfirmasi") !== "ya") return fail("Konfirmasi penghapusan contoh tidak lengkap.");
  try {
    const res = await planDeleteSamples();
    refresh();
    return { status: "ok", message: `${res.deleted} acara contoh dihapus.` };
  } catch (e) {
    return fail(e instanceof DataError ? e.userMessage : "Contoh gagal dihapus. Coba lagi.");
  }
}

// Dibuat oleh Faiz Hazim Hawari · skill-analysis
