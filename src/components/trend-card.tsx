"use client";

import { useState } from "react";

import PillTabs from "@/components/ui/pill-tabs";
import { LineChart } from "@/components/charts/line-chart";
import type { SeriesPoint } from "@/lib/data";

const METRICS = [
  { value: "views", label: "Views" },
  { value: "reach", label: "Jangkauan" },
  { value: "total_interactions", label: "Interaksi" },
  { value: "new_followers", label: "Follower baru" },
] as const;

type MetricKey = (typeof METRICS)[number]["value"];

/**
 * Tren harian satu metrik per tampilan. Metrik berbeda skala tidak pernah
 * ditumpuk dalam satu grafik dua sumbu (dataviz non-negotiable).
 */
export function TrendCard({ series }: { series: SeriesPoint[] }) {
  const [metric, setMetric] = useState<MetricKey>("views");
  const label = METRICS.find((m) => m.value === metric)!.label;
  return (
    <div className="flex flex-col gap-4">
      <PillTabs
        tabs={METRICS}
        value={metric}
        onChange={(v) => setMetric(v as MetricKey)}
        aria-label="Pilih metrik grafik"
        className="no-print"
      />
      <LineChart
        points={series.map((p) => ({ x: p.date, y: p[metric] }))}
        seriesLabel={label}
        yFormat="int"
        xFormat="ymd"
      />
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
