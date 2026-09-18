import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";

/**
 * Kunci aksi tulis halaman Rencana.
 *
 * Dashboard sengaja tanpa login (keputusan user 17 Sep 2026), tetapi menulis
 * jadwal tidak boleh terbuka untuk siapa saja karena URL production bersifat
 * publik. Aturannya:
 *   - membaca kalender: bebas, tanpa PIN;
 *   - menambah/mengubah/menghapus: perlu PIN dari env PLAN_EDIT_PIN.
 *
 * Cookie hanya menyimpan sidik (sha256 dari PIN + garam tetap), bukan PIN-nya,
 * dan tidak bisa ditebak tanpa tahu PIN. httpOnly, jadi tidak terbaca skrip di
 * browser. Setiap server action tetap memeriksa ulang; UI yang menyembunyikan
 * tombol bukan pengaman (skill-analysis §9.6).
 */

const COOKIE = "rencana_edit";
const SALT = "lifeatptpn-insight/rencana";
const MAX_AGE_SECONDS = 12 * 3600;
const MIN_PIN_LENGTH = 4;

/** Gagal berturut-turut per alamat IP, ditahan sementara. Hanya per instance server. */
const ATTEMPT_LIMIT = 5;
const ATTEMPT_WINDOW_MS = 10 * 60_000;
const attempts = new Map<string, { n: number; until: number }>();

function digest(value: string) {
  return createHash("sha256").update(`${SALT}:${value}`).digest("hex");
}

function sameString(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function editPinConfigured() {
  const pin = process.env.PLAN_EDIT_PIN ?? "";
  return pin.trim().length >= MIN_PIN_LENGTH;
}

/** Sudah membuka kunci di browser ini? */
export async function isUnlocked() {
  if (!editPinConfigured()) return false;
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  return Boolean(token && sameString(token, digest(process.env.PLAN_EDIT_PIN!.trim())));
}

export type UnlockResult = { ok: true } | { ok: false; message: string };

export async function unlockWithPin(pin: string): Promise<UnlockResult> {
  if (!editPinConfigured()) {
    return { ok: false, message: "PIN belum diatur di server (env PLAN_EDIT_PIN), jadi jadwal belum bisa diubah dari web." };
  }
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "lokal";
  const state = attempts.get(ip);
  const now = Date.now();
  if (state && state.n >= ATTEMPT_LIMIT && state.until > now) {
    const minutes = Math.ceil((state.until - now) / 60_000);
    return { ok: false, message: `Terlalu banyak percobaan. Coba lagi dalam ${minutes} menit.` };
  }

  const expected = process.env.PLAN_EDIT_PIN!.trim();
  // Bandingkan sidiknya, bukan teks mentah: panjang PIN tidak ikut bocor lewat waktu proses.
  if (!sameString(digest(pin.trim()), digest(expected))) {
    const next = state && state.until > now ? { n: state.n + 1, until: state.until } : { n: 1, until: now + ATTEMPT_WINDOW_MS };
    attempts.set(ip, next);
    return { ok: false, message: "PIN salah." };
  }

  attempts.delete(ip);
  const jar = await cookies();
  jar.set(COOKIE, digest(expected), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return { ok: true };
}

export async function lockEditing() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** Dipakai di setiap server action sebelum menulis. */
export async function assertUnlocked() {
  if (!(await isUnlocked())) {
    throw new Error("TERKUNCI");
  }
}

// Dibuat oleh Faiz Hazim Hawari · skill-analysis
