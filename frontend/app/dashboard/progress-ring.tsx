import type { FortnightlySummary } from "@/lib/api-server";

const COLORS = {
  safe: {
    from: "#34d399",
    to: "#22d3ee",
    label: "On track",
    bg: "bg-emerald-500/15",
    text: "text-emerald-300",
    ring: "ring-emerald-500/30",
  },
  warn: {
    from: "#fbbf24",
    to: "#f59e0b",
    label: "Heads up",
    bg: "bg-yellow-500/15",
    text: "text-yellow-300",
    ring: "ring-yellow-500/30",
  },
  danger: {
    from: "#fb923c",
    to: "#ef4444",
    label: "Danger",
    bg: "bg-orange-500/15",
    text: "text-orange-300",
    ring: "ring-orange-500/30",
  },
  breach: {
    from: "#ef4444",
    to: "#b91c1c",
    label: "Breach",
    bg: "bg-red-500/15",
    text: "text-red-300",
    ring: "ring-red-500/30",
  },
};

export default function ProgressRing({
  summary,
  offset,
}: {
  summary: FortnightlySummary;
  offset: number;
}) {
  const size = 240;
  const stroke = 16;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(summary.percent_used, 100) / 100;
  const dashoffset = circ * (1 - pct);
  const color = COLORS[summary.threshold];
  const isPast = offset < 0;
  const isFuture = offset > 0;
  const gradId = `ring-grad-${summary.threshold}`;

  if (!summary.is_semester) {
    return (
      <div className="glass relative flex flex-col items-center justify-center overflow-hidden rounded-3xl p-8">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-slate-400/10 blur-3xl" />
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-500/15 px-3 py-1 text-xs text-slate-300">
          <span>🌴</span> Break period
        </div>
        <div className="mt-4 text-5xl font-bold tracking-tight">
          {summary.hours_used.toFixed(1)}
          <span className="text-xl text-slate-400">h</span>
        </div>
        <p className="mt-2 max-w-[220px] text-center text-sm text-slate-400">
          No 48h cap during breaks. Work freely.
        </p>
      </div>
    );
  }

  return (
    <div className="glass relative flex flex-col items-center rounded-3xl p-6 sm:p-8">
      <div className="mb-4 flex items-center gap-2 text-xs text-slate-400">
        {isPast ? (
          <span className="rounded-full bg-slate-500/15 px-2.5 py-0.5 text-slate-300">
            Past fortnight
          </span>
        ) : isFuture ? (
          <span className="rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-indigo-300">
            Upcoming
          </span>
        ) : (
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-emerald-300">
            Live
          </span>
        )}
        <span>{summary.days_remaining}d left</span>
      </div>

      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color.from} />
              <stop offset="100%" stopColor={color.to} />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`url(#${gradId})`}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={circ}
            strokeDashoffset={dashoffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 600ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-5xl font-bold tracking-tight sm:text-6xl">
            {summary.hours_used.toFixed(1)}
          </div>
          <div className="text-xs text-slate-400">
            of {summary.limit}h · {summary.percent_used.toFixed(0)}%
          </div>
        </div>
      </div>

      <div
        className={`mt-5 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ring-1 ${color.bg} ${color.text} ${color.ring}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {color.label} · {summary.hours_remaining.toFixed(1)}h remaining
      </div>

      {offset === 0 ? (
        <div className="mt-4 w-full rounded-xl border border-white/5 bg-white/5 p-3 text-center text-xs">
          <div className="text-slate-400">
            Rolling 14-day (Home Affairs reading)
          </div>
          <div
            className={`mt-1 text-sm font-semibold ${COLORS[summary.rolling_threshold].text}`}
          >
            {summary.rolling_hours_used.toFixed(1)}h in last 14 days
          </div>
        </div>
      ) : null}
    </div>
  );
}
