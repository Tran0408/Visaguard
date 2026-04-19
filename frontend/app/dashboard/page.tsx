import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { api } from "@/lib/api-server";
import ProgressRing from "./progress-ring";
import ShiftList from "./shift-list";
import ManualShiftForm from "./manual-shift-form";
import EmailProgressBanner from "./email-progress-banner";
import FortnightNav from "./fortnight-nav";
import InboxPill from "./inbox-pill";
import HelpButton from "./help-button";

export const dynamic = "force-dynamic";

function parseOffset(raw: string | string[] | undefined): number {
  if (!raw) return 0;
  const v = Array.isArray(raw) ? raw[0] : raw;
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-52, Math.min(52, n));
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { fn?: string };
}) {
  const me = await api.me();
  if (!me.onboarded) redirect("/onboarding");

  const offset = parseOffset(searchParams?.fn);
  const [summary, shifts] = await Promise.all([
    api.fortnightly(offset),
    api.listShifts(),
  ]);

  const periodStart = summary.period_start;
  const periodEnd = summary.period_end;
  const periodShifts = shifts.filter(
    (s) => s.shift_date >= periodStart && s.shift_date <= periodEnd,
  );

  const emptyHint =
    offset < 0
      ? "No shifts recorded for this past fortnight."
      : offset > 0
        ? "No shifts scheduled here yet. Sync a calendar or forward a roster."
        : "Forward a roster email or add one manually.";

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6 sm:pb-12 sm:pt-8">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 text-black font-bold">
            V
          </span>
          <div className="leading-tight">
            <div className="text-base font-semibold">VisaGuard</div>
            <div className="text-[11px] text-slate-400">
              Hi, {me.email.split("@")[0]}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10 sm:text-sm"
          >
            Settings
          </Link>
          <HelpButton />
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <InboxPill address={me.unique_inbox} />

      <EmailProgressBanner />

      <div className="mb-5">
        <FortnightNav
          offset={offset}
          periodStart={periodStart}
          periodEnd={periodEnd}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-[minmax(0,320px)_1fr]">
        <div className="md:sticky md:top-6 md:self-start">
          <ProgressRing summary={summary} offset={offset} />
        </div>

        <div className="space-y-5">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200">
                Shifts in this fortnight
              </h2>
              <span className="text-xs text-slate-400">
                {periodShifts.length}{" "}
                {periodShifts.length === 1 ? "shift" : "shifts"}
              </span>
            </div>
            <ShiftList shifts={periodShifts} emptyHint={emptyHint} />
          </div>

          <ManualShiftForm />
        </div>
      </div>
    </main>
  );
}
