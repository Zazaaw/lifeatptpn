import { getQuizEntries } from "@/lib/data";
import { DataError } from "@/lib/supabase-server";

/**
 * Peserta Spin Wheel dari komentar satu post (hanya baca).
 * GET /api/quiz/entries?media=<id>&keyword=&until=<ISO>&exclude=a,b&replies=1
 *
 * Semua parameter divalidasi di server (skill-analysis §9.6): ID harus angka,
 * panjang teks dibatasi, batas waktu harus tanggal valid.
 */
export const dynamic = "force-dynamic";

const bad = (message: string) => Response.json({ error: message }, { status: 400 });

export async function GET(request: Request) {
  const url = new URL(request.url);
  const media = url.searchParams.get("media") ?? "";
  if (!/^\d{5,30}$/.test(media)) return bad("Post tidak valid.");

  const keyword = (url.searchParams.get("keyword") ?? "").trim();
  if (keyword.length > 60) return bad("Kata kunci maksimal 60 karakter.");

  const untilRaw = url.searchParams.get("until");
  let until: string | null = null;
  if (untilRaw) {
    const d = new Date(untilRaw);
    if (Number.isNaN(d.getTime())) return bad("Batas waktu tidak valid.");
    until = d.toISOString();
  }

  const exclude = (url.searchParams.get("exclude") ?? "")
    .split(/[\s,]+/)
    .map((x) => x.replace(/^@+/, "").trim())
    .filter(Boolean);
  if (exclude.length > 50 || exclude.some((x) => x.length > 40)) return bad("Daftar pengecualian terlalu panjang.");

  const includeReplies = url.searchParams.get("replies") === "1";

  try {
    const data = await getQuizEntries({ mediaId: media, keyword: keyword || null, until, exclude, includeReplies });
    return Response.json(data, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    const message = e instanceof DataError ? e.userMessage : "Peserta gagal dimuat.";
    return Response.json({ error: message }, { status: 500 });
  }
}

// Dibuat oleh Faiz Hazim Hawari · skill-analysis
