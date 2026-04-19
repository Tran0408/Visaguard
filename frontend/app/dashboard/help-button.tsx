"use client";

import { useEffect, useState } from "react";

export default function HelpButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="How VisaGuard works"
        title="How it works"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-slate-200 transition hover:border-emerald-400/40 hover:bg-emerald-500/10 hover:text-emerald-200"
      >
        i
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="glass relative max-h-[90vh] w-full overflow-y-auto rounded-t-3xl p-5 sm:max-w-2xl sm:rounded-2xl sm:p-6"
          >
            <div className="sticky top-0 -mx-5 mb-4 flex items-start justify-between gap-3 bg-[rgba(12,17,28,0.85)] px-5 pb-3 pt-1 backdrop-blur sm:-mx-6 sm:px-6">
              <div>
                <h2 className="text-lg font-bold tracking-tight">
                  How VisaGuard works
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Setup flow, shift sources, and both fortnight meters explained.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-5 text-sm text-slate-300">
              <Section
                n="1"
                title="Get shifts in"
                color="emerald"
              >
                <p>Three ways. Use any combo.</p>
                <ul className="mt-2 space-y-2 pl-0">
                  <Bullet icon="📨" heading="Forward roster emails">
                    Copy your VisaGuard inbox (green pill on dashboard). Forward
                    rosters there, or set Gmail auto-forward (Settings → Gmail
                    auto-forward setup). Parser pulls date, times, employer.
                    Live progress banner shows when email arrives.
                  </Bullet>
                  <Bullet icon="📅" heading="Connect calendar feeds (ICS)">
                    Settings → Roster calendar feeds. One feed per job. You
                    enter the employer name yourself — every shift from that
                    feed tags with that name. Supports Humanforce, Deputy,
                    Google Calendar secret iCal. Add as many as you have jobs.
                  </Bullet>
                  <Bullet icon="✍️" heading="Add manually">
                    Bottom of dashboard. Good for cash shifts or when a roster
                    arrives late.
                  </Bullet>
                </ul>
              </Section>

              <Section n="2" title="Fix names + breaks per employer" color="cyan">
                <p>Settings → Employers row. Each employer has two controls:</p>
                <ul className="mt-2 space-y-2 pl-0">
                  <Bullet icon="🏷️" heading="Rename">
                    Auto-detected names can be noisy. Rename once — every
                    existing and future shift for that employer updates.
                  </Bullet>
                  <Bullet icon="☕" heading="Breaks">
                    Unpaid breaks do not count toward your 48-hour limit.
                    Define tiers: <em>shift ≥ X hours → Y minutes unpaid</em>.
                    Longest matching tier wins. Example: 5h→30m, 7h→60m means a
                    6h shift nets 5.5h, an 8h shift nets 7h. Save triggers
                    automatic recompute across all that employer&apos;s shifts.
                  </Bullet>
                </ul>
              </Section>

              <Section n="3" title="Edit a shift" color="amber">
                <p>
                  On dashboard, pencil icon on any shift. Edit start, end,
                  break minutes. Manual break value overrides employer rules
                  and sticks — even if you change rules later. Click{" "}
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs">
                    Use employer rule
                  </span>{" "}
                  on an overridden shift to opt back in.
                </p>
              </Section>

              <Section n="4" title="Two fortnight meters" color="violet">
                <p className="mb-3">
                  The dashboard shows two separate limits. Both matter for
                  subclass-500 compliance.
                </p>

                <MeterCard
                  badge="Primary"
                  badgeCls="bg-emerald-500/20 text-emerald-300 ring-emerald-500/30"
                  title="Period fortnight"
                >
                  <p>
                    Fixed 14-day window based on your semester dates (set at
                    onboarding). Starts at your semester start, rolls every 14
                    days. Use prev/next arrows above the ring to browse past
                    and future fortnights.
                  </p>
                  <p className="mt-2">
                    <b>Limit depends on period type:</b>
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-slate-400">
                    <li>
                      <b className="text-slate-200">Semester (in-session):</b>{" "}
                      48 hours per fortnight. Home Affairs cap.
                    </li>
                    <li>
                      <b className="text-slate-200">Break (holidays):</b>{" "}
                      Unlimited. Meter still runs so you can see load, but no
                      cap applies.
                    </li>
                  </ul>
                  <p className="mt-2 text-xs text-slate-400">
                    Thresholds: <span className="text-emerald-300">safe</span>{" "}
                    &lt; 75% · <span className="text-yellow-300">warn</span>{" "}
                    75-90% · <span className="text-orange-300">danger</span>{" "}
                    90-100% · <span className="text-red-400">breach</span>{" "}
                    &gt; 48h.
                  </p>
                </MeterCard>

                <MeterCard
                  badge="Secondary"
                  badgeCls="bg-cyan-500/20 text-cyan-300 ring-cyan-500/30"
                  title="Rolling 14-day"
                  className="mt-3"
                >
                  <p>
                    Sum of hours across <b>any</b> continuous 14-day window
                    ending today. Independent of semester periods. Only shown
                    on the current fortnight view.
                  </p>
                  <p className="mt-2">
                    Why separate: students sometimes pass the period check but
                    still work 50h across two half-periods. Immigration case
                    officers check both. If rolling 14d goes over 48h during a
                    semester period, treat it as a breach regardless of what
                    the primary meter says.
                  </p>
                </MeterCard>
              </Section>

              <Section n="5" title="Where stuff lives" color="slate">
                <ul className="space-y-1.5 text-xs text-slate-400">
                  <Row k="Forwarding inbox" v="Settings → top card (tap to copy)" />
                  <Row k="Add calendar feed" v="Settings → Roster calendar feeds → + Add another feed" />
                  <Row k="Rename employer" v="Settings → Employers → Rename" />
                  <Row k="Break rules" v="Settings → Employers → Breaks" />
                  <Row k="Edit a single shift" v="Dashboard → pencil icon on the shift" />
                  <Row k="Past/future fortnights" v="Dashboard → ← / → above the ring" />
                </ul>
              </Section>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Section({
  n,
  title,
  color,
  children,
}: {
  n: string;
  title: string;
  color: "emerald" | "cyan" | "amber" | "violet" | "slate";
  children: React.ReactNode;
}) {
  const colorCls = {
    emerald: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/30",
    cyan: "bg-cyan-500/20 text-cyan-300 ring-cyan-500/30",
    amber: "bg-amber-500/20 text-amber-300 ring-amber-500/30",
    violet: "bg-violet-500/20 text-violet-300 ring-violet-500/30",
    slate: "bg-slate-500/20 text-slate-300 ring-slate-500/30",
  }[color];
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-100">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ring-1 ${colorCls}`}
        >
          {n}
        </span>
        {title}
      </h3>
      <div className="pl-8">{children}</div>
    </section>
  );
}

function Bullet({
  icon,
  heading,
  children,
}: {
  icon: string;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-sm">
        {icon}
      </span>
      <div>
        <div className="text-sm font-medium text-slate-200">{heading}</div>
        <div className="mt-0.5 text-xs text-slate-400">{children}</div>
      </div>
    </li>
  );
}

function MeterCard({
  badge,
  badgeCls,
  title,
  className,
  children,
}: {
  badge: string;
  badgeCls: string;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border border-white/10 bg-black/20 p-3 ${className ?? ""}`}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${badgeCls}`}
        >
          {badge}
        </span>
        <span className="text-sm font-semibold text-slate-100">{title}</span>
      </div>
      <div className="text-xs text-slate-400">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <li className="flex flex-wrap justify-between gap-3 rounded-lg bg-white/5 px-2.5 py-1.5">
      <span className="text-slate-300">{k}</span>
      <span className="text-slate-500">{v}</span>
    </li>
  );
}
