import type { FortnightlySummary } from "@/lib/api-server";

const COLORS = {
  safe: { stroke: "#22c55e", label: "Safe", bg: "bg-emerald-500/10", text: "text-emerald-300" },
  warn: { stroke: "#eab308", label: "Heads up", bg: "bg-yellow-500/10", text: "text-yellow-300" },
  danger: { stroke: "#f97316", label: "Danger", bg: "bg-orange-500/10", text: "text-orange-300" },
  breach: { stroke: "#ef4444", label: "Breach", bg: "bg-red-500/10", text: "text-red-300" },
};

export default function ProgressRing({ summary }: { summary: FortnightlySummary }) {
  const size = 220;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(summary.percent_used, 100) / 100;
  const dashoffset = circ * (1 - pct);
  const color = COLORS[summary.threshold];

  if (!summary.is_semester) {
    return (
      <div className="flex flex-col items-center rounded-lg border border-slate-800 bg-slate-900/40 p-8">
        <div className="mb-2 rounded-full bg-slate-700/40 px-3 py-1 text-xs text-slate-300">
          Break period
        </div>
        <div className="mt-2 text-3xl font-bold">{summary.hours_used.toFixed(1)}h</div>
        <p className="mt-2 text-sm text-slate-400">
          No 48-hour cap during breaks. Work freely.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center rounded-lg border border-slate-800 bg-slate-900/40 p-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#1e293b"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color.stroke}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={circ}
            strokeDashoffset={dashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl font-bold">{summary.hours_used.toFixed(1)}</div>
          <div className="text-xs text-slate-400">of {summary.limit}h used</div>
        </div>
      </div>
      <div className={`mt-4 rounded-full px-3 py-1 text-xs font-medium ${color.bg} ${color.text}`}>
        {color.label} · {summary.hours_remaining.toFixed(1)}h remaining
      </div>
      <div className="mt-3 text-xs text-slate-400">
        Mon–Sun fortnight · ends{" "}
        {new Date(summary.period_end).toLocaleDateString("en-AU")} ·{" "}
        {summary.days_remaining}d left
      </div>
      <div className="mt-4 w-full border-t border-slate-800 pt-3 text-center text-xs">
        <div className="text-slate-400">
          Rolling 14-day check (Home Affairs reading)
        </div>
        <div
          className={`mt-1 font-medium ${COLORS[summary.rolling_threshold].text}`}
        >
          {summary.rolling_hours_used.toFixed(1)}h in last 14 days
        </div>
      </div>
    </div>
  );
}
