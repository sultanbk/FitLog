import type { AnalyticsBucket } from "@/lib/progress-analytics";

type Props = {
  title: string;
  description: string;
  buckets: AnalyticsBucket[];
  metric: "calories" | "protein" | "pushUps" | "averageWeight";
  unit: string;
  color: string;
  chartType?: "bar" | "line";
};

export function ProgressChart({ title, description, buckets, metric, unit, color, chartType = "bar" }: Props) {
  const values = buckets.map((bucket) => bucket[metric]);
  const present = values.filter((value): value is number => value !== null);
  const recordedBuckets = buckets.filter((bucket) =>
    metric === "calories" || metric === "protein"
      ? bucket.foodDays > 0
      : metric === "pushUps"
        ? bucket.exerciseDays > 0
        : bucket.weighInCount > 0,
  );
  const periodsWithRecords = recordedBuckets.length;
  const hasData = periodsWithRecords > 0;
  const maximum = Math.max(...present, 1);
  const minimumWeight = chartType === "line" && present.length ? Math.min(...present) : 0;
  const maximumWeight = chartType === "line" && present.length ? Math.max(...present) : 0;
  const weightRange = maximumWeight - minimumWeight;
  const baseline = 132;
  const top = 18;
  const chartWidth = buckets.length > 12 ? 640 : 400;
  const step = (chartWidth - 40) / buckets.length;
  const recordedKeys = new Set(recordedBuckets.map((bucket) => bucket.key));
  const coordinates = values.flatMap((value, index) => {
    if (value === null) return [];
    return [{
      key: buckets[index].key,
      label: buckets[index].label,
      value,
      x: 20 + step * (index + 0.5),
      y: chartType === "line"
        ? top + (weightRange === 0 ? (baseline - top) / 2 : ((maximumWeight - value) / weightRange) * (baseline - top))
        : baseline - (value / maximum) * (baseline - top),
    }];
  });
  const recordedPoints = coordinates.filter((point) => recordedKeys.has(point.key));
  const latest = recordedPoints.at(-1);
  const highest = recordedPoints.reduce<typeof latest>((result, point) =>
    !result || point.value > result.value ? point : result, undefined);
  const labelStep = buckets.length > 20 ? 7 : buckets.length > 7 ? 3 : 1;
  const dateLabels = buckets.filter((_, index) =>
    index === 0 || index === buckets.length - 1 || index % labelStep === 0,
  );

  return (
    <section className="fit-card min-w-0" aria-label={`${title} chart`}>
      <div>
        <h3 className="text-xl">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-[#7b8077]">{description}</p>
      </div>
      {hasData ? (
        <>
          <div className="mt-4 overflow-x-auto overscroll-x-contain" role="region" aria-label={`${title} chart; swipe horizontally to inspect dates`} tabIndex={0}>
              <svg viewBox={`0 0 ${chartWidth} 178`} role="img" aria-label={`${title} in ${unit} for the selected period`} className={`fit-progress-chart block h-auto w-full ${chartWidth > 400 ? "is-wide" : ""}`}>
                <line x1="20" y1={baseline} x2={chartWidth - 20} y2={baseline} stroke="#e6e3da" strokeWidth="1" />
              {chartType === "bar" && buckets.map((bucket, index) => {
                const value = values[index];
                if (value === null) return null;
                const width = Math.min(24, step * 0.58);
                const height = value === 0 ? 0 : Math.max(2, (value / maximum) * (baseline - top));
                return <g key={bucket.key}><rect x={20 + step * (index + 0.5) - width / 2} y={baseline - height} width={width} height={height} rx="3" fill={color}><title>{`${bucket.key}: ${value} ${unit}`}</title></rect></g>;
              })}
              {chartType === "line" && coordinates.length > 1 && <polyline points={coordinates.map(({ x, y }) => `${x},${y}`).join(" ")} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
              {chartType === "line" && coordinates.map((point) => <circle key={point.key} cx={point.x} cy={point.y} r="4" fill="#fffefa" stroke={color} strokeWidth="2"><title>{`${point.key}: ${point.value} ${unit}`}</title></circle>)}
              {chartType === "line" && coordinates.length === 1 && <circle cx={coordinates[0].x} cy={coordinates[0].y} r="4" fill="#fffefa" stroke={color} strokeWidth="2" />}
              {dateLabels.map((bucket) => {
                const index = buckets.findIndex((entry) => entry.key === bucket.key);
                const x = 20 + step * (index + 0.5);
                return <text key={bucket.key} x={x} y="158" textAnchor="middle" fill="#7b8077" fontSize="11">{bucket.label}</text>;
              })}
            </svg>
          </div>
          <p className="mt-1 text-xs text-[#7b8077]">{periodsWithRecords} {metric === "averageWeight" ? "interval(s) with weigh-ins" : "period(s) with records"} · {unit}</p>
          <dl className="mt-4 grid grid-cols-2 gap-2" aria-label={`${title} data summary`}>
            {latest && <div className="rounded-lg bg-[#f6f4ef] px-3 py-2.5">
              <dt className="text-[11px] leading-4 text-[#7b8077]">Latest logged · {latest.label}</dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums text-[#35483a]">{latest.value.toLocaleString(undefined, { maximumFractionDigits: 1 })} {unit}</dd>
            </div>}
            {highest && <div className="rounded-lg bg-[#f6f4ef] px-3 py-2.5">
              <dt className="text-[11px] leading-4 text-[#7b8077]">Highest logged · {highest.label}</dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums text-[#35483a]">{highest.value.toLocaleString(undefined, { maximumFractionDigits: 1 })} {unit}</dd>
            </div>}
          </dl>
        </>
      ) : (
        <p className="mt-5 rounded-lg bg-[#faf9f5] p-4 text-sm leading-6 text-[#62685f]">No {title.toLowerCase()} entries in this period yet. When you log some, the chart will appear here.</p>
      )}
    </section>
  );
}
