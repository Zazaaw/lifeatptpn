/**
 * Logika Spin Wheel yang murni (tanpa React) supaya bisa diuji.
 *
 * Keadilan: pemenang DIPILIH LEBIH DULU memakai crypto.getRandomValues dengan
 * rejection sampling (tanpa bias modulo). Animasi roda hanya menampilkan hasil
 * itu: sudut akhir dihitung supaya penunjuk berhenti di segmen pemenang.
 */

export type WheelEntry = {
  /** Nama yang tampil (username tanpa @, atau teks input manual). */
  label: string;
  /** Bobot kesempatan; 1 bila satu akun satu kesempatan. */
  weight: number;
  /** Info tambahan untuk kartu pemenang. */
  detail?: string;
  href?: string;
};

export type Segment = WheelEntry & { start: number; end: number };

/** Bilangan bulat acak seragam di [0, max) dari CSPRNG. */
export function randomInt(max: number, rng: (buf: Uint32Array) => Uint32Array = (b) => crypto.getRandomValues(b)) {
  if (!Number.isInteger(max) || max <= 0 || max > 2 ** 32) throw new Error("max tidak valid");
  const limit = 2 ** 32 - (2 ** 32 % max); // nilai di atas ini ditolak supaya tidak bias
  const buf = new Uint32Array(1);
  for (;;) {
    rng(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
}

/** Segmen berurutan searah jarum jam mulai dari atas (0 derajat). */
export function buildSegments(entries: WheelEntry[]): Segment[] {
  const total = entries.reduce((s, e) => s + e.weight, 0);
  if (total <= 0) return [];
  let acc = 0;
  return entries.map((e) => {
    const start = (acc / total) * 360;
    acc += e.weight;
    return { ...e, start, end: (acc / total) * 360 };
  });
}

/** Indeks pemenang berbobot. Bobot harus bilangan bulat positif. */
export function pickWinner(entries: WheelEntry[], rng?: (buf: Uint32Array) => Uint32Array) {
  const total = entries.reduce((s, e) => s + e.weight, 0);
  let r = randomInt(total, rng);
  for (let i = 0; i < entries.length; i++) {
    r -= entries[i].weight;
    if (r < 0) return i;
  }
  return entries.length - 1;
}

/**
 * Rotasi akhir (derajat, searah jarum jam) supaya penunjuk di atas berhenti
 * pada sudut `targetAngle` roda, setelah `spins` putaran penuh dari posisi sekarang.
 */
export function finalRotation(current: number, targetAngle: number, spins: number) {
  const want = (((360 - targetAngle) % 360) + 360) % 360;
  const now = ((current % 360) + 360) % 360;
  let delta = (((want - now) % 360) + 360) % 360;
  // Pembulatan floating point bisa menghasilkan 359,99999… untuk selisih yang
  // sebenarnya 0; tanpa ini roda berputar satu putaran ekstra.
  if (delta > 360 - 1e-6) delta = 0;
  return current + spins * 360 + delta;
}

/** Sudut roda yang sedang berada di bawah penunjuk untuk rotasi tertentu. */
export function angleUnderPointer(rotation: number) {
  return (((360 - rotation) % 360) + 360) % 360;
}

/** Segmen di bawah penunjuk (pencarian biner; aman untuk ribuan segmen). */
export function segmentIndexAt(segments: Segment[], rotation: number) {
  if (segments.length === 0) return -1;
  const a = angleUnderPointer(rotation);
  let lo = 0;
  let hi = segments.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (segments[mid].end <= a) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Titik berhenti di dalam segmen pemenang: acak di bagian tengah segmen
 * (15% s.d. 85% lebarnya) supaya tidak berhenti tepat di garis batas.
 */
export function landingAngle(segment: Segment, rng?: (buf: Uint32Array) => Uint32Array) {
  const width = segment.end - segment.start;
  const frac = 0.15 + (randomInt(1000, rng) / 1000) * 0.7;
  return segment.start + width * frac;
}

/** Nama dari teks input manual: satu per baris atau dipisah koma. */
export function parseManualNames(text: string, dedupe: boolean) {
  const names = text
    .split(/[\n,;]+/)
    .map((x) => x.trim().replace(/^@+/, ""))
    .filter(Boolean)
    .map((x) => x.slice(0, 80));
  if (!dedupe) return names;
  const seen = new Set<string>();
  return names.filter((n) => {
    const k = n.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// Dibuat oleh Faiz Hazim Hawari · skill-analysis
