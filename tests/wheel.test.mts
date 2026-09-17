// Uji keadilan & ketepatan Spin Wheel. Jalankan: npm test
// (Node 24 menjalankan TypeScript langsung dengan type stripping.)
import { randomInt, buildSegments, pickWinner, finalRotation, segmentIndexAt, landingAngle, parseManualNames, angleUnderPointer } from "../src/lib/wheel.ts";
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
// 4) sudut di bawah penunjuk
ok(angleUnderPointer(0) === 0 && angleUnderPointer(90) === 270 && angleUnderPointer(-90) === 90, "angleUnderPointer");
// 5) parsing manual
const names = parseManualNames("@Budi\nsiti, budi;  ANI \n\n@@ani", true);
console.log("manual", names); ok(names.join("|") === "Budi|siti|ANI", "dedupe manual");
ok(parseManualNames("a\na", false).length === 2, "tanpa dedupe");
console.log(fail ? `${fail} gagal` : "SEMUA LULUS");
if (fail) process.exit(1);

// Dibuat oleh Faiz Hazim Hawari · skill-analysis
