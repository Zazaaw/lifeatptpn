"use client";

import { memo, useMemo } from "react";
import { motion, useTransform, type MotionValue } from "motion/react";
import { CaretDownIcon } from "@phosphor-icons/react";

import { segmentIndexAt, type Segment } from "@/lib/wheel";

/*
 * Warna segmen dekoratif dari palet logo (bukan encoding data), dipasangkan
 * dengan warna teks yang kontrasnya sudah dihitung (>= 4,5:1).
 */
const FILLS = [
  { fill: "#2F6E2E", text: "#FFFFFF" },
  { fill: "#FF9100", text: "#172019" },
  { fill: "#4CA7DD", text: "#172019" },
  { fill: "#EEF3EB", text: "#172019" }, // terang: roda berdiri di panggung gelap, segmen gelap akan tenggelam
  { fill: "#70AE6D", text: "#172019" },
  { fill: "#FFE7C7", text: "#172019" },
];

const SIZE = 400;
const R = 196;
const C = SIZE / 2;
const LABEL_LIMIT = 48; // di atas ini label tidak muat; nama ditampilkan di bawah penunjuk

function polar(angleDeg: number, radius: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [C + radius * Math.cos(a), C + radius * Math.sin(a)] as const;
}

function arcPath(start: number, end: number) {
  if (end - start >= 359.999) {
    return `M ${C} ${C - R} A ${R} ${R} 0 1 1 ${C - 0.01} ${C - R} Z`;
  }
  const [x1, y1] = polar(start, R);
  const [x2, y2] = polar(end, R);
  const large = end - start > 180 ? 1 : 0;
  return `M ${C} ${C} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`;
}

const WheelFace = memo(function WheelFace({ segments }: { segments: Segment[] }) {
  const showLabels = segments.length <= LABEL_LIMIT;
  const stroke = segments.length > 150 ? 0.4 : 2;
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full" aria-hidden>
      {segments.map((s, i) => {
        const color = FILLS[i % FILLS.length];
        // Hindari dua segmen bertetangga berwarna sama saat jumlah segmen kelipatan tak pas.
        const last = i === segments.length - 1 && segments.length % FILLS.length === 1 && segments.length > 1;
        const c = last ? FILLS[2] : color;
        const mid = (s.start + s.end) / 2;
        const [lx, ly] = polar(mid, R * 0.62);
        const label = s.label.length > 14 ? `${s.label.slice(0, 13)}…` : s.label;
        return (
          <g key={`${s.label}-${i}`}>
            <path d={arcPath(s.start, s.end)} fill={c.fill} stroke="hsl(var(--ink))" strokeWidth={stroke} />
            {showLabels ? (
              <text
                x={lx}
                y={ly}
                fill={c.text}
                fontSize={segments.length > 24 ? 10 : 13}
                fontWeight={600}
                textAnchor="middle"
                dominantBaseline="middle"
                // Label searah jari-jari. Di setengah kiri roda (posisi awal) label dibalik 180 derajat
                // supaya tidak terbaca terbalik saat roda diam; tetap searah jari-jari.
                transform={`rotate(${mid > 180 ? mid + 90 : mid - 90} ${lx} ${ly})`}
              >
                {label}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
});

/**
 * Roda. Rotasi dikendalikan MotionValue dari induk (tidak lewat state React,
 * skill-ui-ux §3.B), dan nama di bawah penunjuk diturunkan dari rotasi yang sama.
 */
export function Wheel({
  segments,
  rotation,
  onSpin,
  disabled,
  spinning,
}: {
  segments: Segment[];
  rotation: MotionValue<number>;
  onSpin: () => void;
  disabled: boolean;
  spinning: boolean;
}) {
  const labels = useMemo(() => segments.map((s) => s.label), [segments]);
  const current = useTransform(rotation, (r) => {
    const i = segmentIndexAt(segments, r);
    return i >= 0 ? `@${labels[i]}` : "";
  });

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div className="relative aspect-square w-full max-w-[34rem]">
        <CaretDownIcon
          weight="fill"
          className="absolute -top-4 left-1/2 z-10 size-14 -translate-x-1/2 text-brand-orange drop-shadow-[0_4px_6px_rgba(0,0,0,0.45)]"
          aria-hidden
        />
        {/* Bingkai roda di panggung gelap: cincin terang + deretan lampu (dekor statis, bukan data). */}
        <div className="absolute inset-0 rounded-full bg-white/10 p-3 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.8)] ring-1 ring-white/15">
          <RimLights />
          <div className="relative size-full rounded-full bg-ink p-1.5">
            <motion.div className="size-full" style={{ rotate: rotation }}>
              {segments.length ? (
                <WheelFace segments={segments} />
              ) : (
                <div className="size-full rounded-full border-2 border-dashed border-white/25" />
              )}
            </motion.div>
          </div>
        </div>
        <button
          type="button"
          onClick={onSpin}
          disabled={disabled}
          className="absolute top-1/2 left-1/2 flex size-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-4 border-white bg-brand-orange text-body font-bold tracking-wide text-[#172019] shadow-[0_10px_30px_-8px_rgba(0,0,0,0.6)] transition-transform outline-hidden hover:scale-105 focus-visible:ring-4 focus-visible:ring-white/70 active:scale-95 disabled:cursor-not-allowed disabled:bg-white/70 disabled:hover:scale-100 md:size-28 md:text-lead"
        >
          {spinning ? "..." : "PUTAR"}
          <span className="sr-only">roda undian</span>
        </button>
      </div>
      {segments.length ? (
        <p className="min-h-10 max-w-full rounded-full bg-white px-5 py-2 text-center text-body font-bold break-all text-[#172019] shadow-lg" aria-hidden>
          <motion.span>{current}</motion.span>
        </p>
      ) : (
        <p className="max-w-[40ch] text-center text-body-sm text-ink-muted">
          Belum ada peserta. Muat dari komentar atau tulis nama di panel peserta.
        </p>
      )}
    </div>
  );
}

/** 24 titik lampu di bingkai; lampu genap sedikit lebih terang supaya terasa seperti roda panggung. */
function RimLights() {
  return (
    <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return (
          <circle
            key={i}
            // Dibulatkan: Math.cos di server dan browser bisa beda di digit terakhir (hydration mismatch).
            cx={(50 + 48.4 * Math.cos(a)).toFixed(3)}
            cy={(50 + 48.4 * Math.sin(a)).toFixed(3)}
            r={0.75}
            fill={i % 2 ? "rgba(255,255,255,0.45)" : "#FFB347"}
          />
        );
      })}
    </svg>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
