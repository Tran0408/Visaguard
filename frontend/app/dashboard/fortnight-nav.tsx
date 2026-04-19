import Link from "next/link";

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}

export default function FortnightNav({
  offset,
  periodStart,
  periodEnd,
}: {
  offset: number;
  periodStart: string;
  periodEnd: string;
}) {
  const label =
    offset === 0
      ? "This fortnight"
      : offset === -1
        ? "Last fortnight"
        : offset === 1
          ? "Next fortnight"
          : offset < 0
            ? `${Math.abs(offset)} fortnights ago`
            : `In ${offset} fortnights`;

  const hrefFor = (o: number) =>
    o === 0 ? "/dashboard" : `/dashboard?fn=${o}`;

  return (
    <div className="glass-strong flex items-center justify-between gap-2 rounded-2xl px-2 py-2">
      <Link
        href={hrefFor(offset - 1)}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white"
        aria-label="Previous fortnight"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M15 18l-6-6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
      <div className="flex min-w-0 flex-col items-center px-2 text-center">
        <span className="text-[11px] uppercase tracking-wider text-slate-400">
          {label}
        </span>
        <span className="truncate text-sm font-semibold text-white sm:text-base">
          {fmt(periodStart)} – {fmt(periodEnd)}
        </span>
      </div>
      <Link
        href={hrefFor(offset + 1)}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white"
        aria-label="Next fortnight"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
    </div>
  );
}
