import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Klien Supabase khusus server.
 *
 * Memakai service_role karena function ig_* hanya boleh dieksekusi role itu
 * (schema ig sengaja tidak diekspos ke anon di project maganghub yang dipakai
 * bersama). Modul ini diberi `server-only`, jadi build gagal kalau ada
 * komponen client yang mengimpornya: key tidak mungkin ikut ke browser.
 */
let client: SupabaseClient | null = null;

export class DataError extends Error {
  constructor(
    /** Pesan aman untuk ditampilkan ke user. */
    public userMessage: string,
    /** Detail teknis, hanya untuk log server. */
    public detail?: string
  ) {
    super(userMessage);
    this.name = "DataError";
  }
}

function getClient() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new DataError(
      "Konfigurasi database belum lengkap. Isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.",
      "missing env"
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/**
 * Panggil function RPC dan lempar DataError bila gagal.
 * Galat tidak pernah diubah jadi data kosong (skill-analysis §13).
 */
export async function rpc<T>(
  fn: string,
  args: Record<string, unknown> = {},
  what = "data"
): Promise<T> {
  const { data, error } = await getClient().rpc(fn, args);
  if (error) {
    console.error(`[rpc:${fn}]`, error.message, error.details ?? "");
    throw new DataError(`Gagal memuat ${what}. Coba muat ulang halaman.`, error.message);
  }
  return data as T;
}

// Dibuat oleh Faiz Hazim Hawari · skill-analysis
