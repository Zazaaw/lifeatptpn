// Uji keadilan & ketepatan Spin Wheel. Jalankan: npm test
// (Node 24 menjalankan TypeScript langsung dengan type stripping.)
import { randomInt, buildSegments, pickWinner, pickWinners, finalRotation, segmentIndexAt, landingAngle, parseManualNames, angleUnderPointer } from "../src/lib/wheel.ts";
let fail = 0; const ok = (c: boolean, m: string) => { if (!c) { fail++; console.log("FAIL", m); } };

// 1) distribusi seragam randomInt
const N = 600000, K = 7, counts = Array(K).fill(0);
for (let i = 0; i < N; i++) counts[randomInt(K)]++;
const exp = N / K; const chi = counts.reduce((s, c) => s + (c - exp) ** 2 / exp, 0);
console.log("randomInt counts", counts, "chi2", chi.toFixed(2)); ok(chi < 22.46, "chi2 df=6 p=0.001");

// 2) pickWinner berbobot mengikuti bobot
const entries = [{ label: "a", weight: 1 }, { label: "b", weight: 3 }, { label: "c", weight: 6 }];
const w = [0, 0, 0]; for (let i = 0; i < 200000; i++) w[pickWinner(entries)]++;
console.log("weighted share", w.map((x) => (x / 200000).toFixed(3))); ok(Math.abs(w[2] / 200000 - 0.6) < 0.01, "bobot 60%");

// 3) roda berhenti di pemenang untuk banyak kasus acak (termasuk 1, 2, ribuan segmen)
for (const n of [1, 2, 3, 12, 37, 500, 2500]) {
  const segs = buildSegments(Array.from({ length: n }, (_, i) => ({ label: "u" + i, weight: 1 + (i % 3) })));
  let current = Math.random() * 10000;
  for (let t = 0; t < 400; t++) {
    const idx = pickWinner(segs);
    const angle = landingAngle(segs[idx]);
    const rot = finalRotation(current, angle, 6);
    ok(rot >= current + 6 * 360 && rot < current + 7 * 360, `spins n=${n}`);
    ok(segmentIndexAt(segs, rot) === idx, `landing n=${n} idx=${idx}`);
    current = rot;
  }
  ok(Math.abs(segs.at(-1)!.end - 360) < 1e-9, "segmen menutup 360");
}
// 3b) pickWinners: tanpa pengembalian, jumlah tepat, dan tetap adil
const many = Array.from({ length: 8 }, (_, i) => ({ label: "p" + i, weight: 1 }));
for (const c of [1, 3, 5, 10]) {
  const got = pickWinners(many, c);
  ok(got.length === Math.min(c, many.length), `jumlah pemenang c=${c}`);
  ok(new Set(got).size === got.length, `tidak ada pemenang ganda c=${c}`);
  ok(got.every((i) => i >= 0 && i < many.length), `indeks valid c=${c}`);
}
ok(pickWinners(many, 0).length === 0, "count 0 tidak mengundi");
ok(pickWinners(many, -4).length === 0, "count negatif tidak mengundi");
ok(pickWinners(many, 2.7).length === 2, "count pecahan dipotong");
ok(pickWinners([], 5).length === 0, "peserta kosong aman");
// Semua peserta punya peluang sama jadi pemenang pertama, dan posisi mana pun
// di daftar hasil tidak boleh condong ke peserta tertentu.
const R = 120000, hit = Array(8).fill(0), first = Array(8).fill(0);
for (let i = 0; i < R; i++) {
  const got = pickWinners(many, 3);
  first[got[0]]++;
  for (const g of got) hit[g]++;
}
const expFirst = R / 8, chiFirst = first.reduce((s, c) => s + (c - expFirst) ** 2 / expFirst, 0);
console.log("pickWinners pemenang pertama", first, "chi2", chiFirst.toFixed(2));
ok(chiFirst < 24.32, "chi2 df=7 p=0.001 pemenang pertama seragam");
ok(hit.every((h) => Math.abs(h / R - 3 / 8) < 0.01), "peluang terpilih 3 dari 8 merata");
// Bobot tetap dihormati: peserta berbobot 6 lebih sering jadi pemenang pertama.
const wEntries = [{ label: "a", weight: 1 }, { label: "b", weight: 3 }, { label: "c", weight: 6 }];
let cFirst = 0;
for (let i = 0; i < 60000; i++) if (pickWinners(wEntries, 2)[0] === 2) cFirst++;
console.log("bobot pemenang pertama c", (cFirst / 60000).toFixed(3));
ok(Math.abs(cFirst / 60000 - 0.6) < 0.01, "bobot 60% di pemenang pertama");
ok(pickWinners(wEntries, 3).length === 3, "mengundi semua peserta berbobot");

// 3c) undian banyak pemenang: roda berputar berantai TANPA mengubah susunan
// segmen, dan penunjuk harus berhenti tepat di tiap pemenang yang sudah diundi
// di awal (ini yang dipakai menu "jumlah pemenang" 1/3/5/10/bebas).
for (const [n, count] of [[8, 3], [8, 8], [25, 5], [120, 10], [3, 10]] as const) {
  const segs = buildSegments(Array.from({ length: n }, (_, i) => ({ label: "u" + i, weight: 1 + (i % 4) })));
  const picks = pickWinners(segs, count);
  ok(picks.length === Math.min(count, n), `jumlah undian n=${n} count=${count}`);
  ok(new Set(picks).size === picks.length, `tanpa nama ganda n=${n} count=${count}`);
  let current = Math.random() * 5000;
  picks.forEach((idx, k) => {
    const turns = k === 0 ? 7 : 3;
    const rot = finalRotation(current, landingAngle(segs[idx]), turns);
    ok(segmentIndexAt(segs, rot) === idx, `berhenti di pemenang ke-${k + 1} (n=${n})`);
    ok(rot >= current + turns * 360 && rot < current + (turns + 1) * 360, `putaran ke-${k + 1} (n=${n})`);
    current = rot % 360; // komponen menyimpan ulang rotasi kecil setelah tiap putaran
  });
}

// 4) sudut di bawah penunjuk
ok(angleUnderPointer(0) === 0 && angleUnderPointer(90) === 270 && angleUnderPointer(-90) === 90, "angleUnderPointer");
// 5) parsing manual
const names = parseManualNames("@Budi\nsiti, budi;  ANI \n\n@@ani", true);
console.log("manual", names); ok(names.join("|") === "Budi|siti|ANI", "dedupe manual");
ok(parseManualNames("a\na", false).length === 2, "tanpa dedupe");
console.log(fail ? `${fail} gagal` : "SEMUA LULUS");
if (fail) process.exit(1);

// Dibuat oleh Faiz Hazim Hawari · skill-analysis
