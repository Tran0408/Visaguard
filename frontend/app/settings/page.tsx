import Link from "next/link";
import { api } from "@/lib/api-server";
import InboxCopy from "./inbox-copy";
import CalendarSection from "./calendar-section";
import EmployersSection from "./employers-section";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [me, feeds, employers] = await Promise.all([
    api.me(),
    api.listCalendarFeeds(),
    api.listEmployers(),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Dashboard
        </Link>
      </div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">
        Settings
      </h1>

      <section className="glass mb-5 rounded-2xl p-5">
        <h2 className="mb-1 text-sm font-semibold">Forwarding inbox</h2>
        <p className="mb-3 text-sm text-slate-400">
          Any email here gets parsed into shifts.
        </p>
        <InboxCopy address={me.unique_inbox} />
      </section>

      <section className="glass mb-5 rounded-2xl p-5">
        <h2 className="mb-1 text-sm font-semibold">Roster calendar feeds (ICS)</h2>
        <p className="mb-3 text-sm text-slate-400">
          Add one per job. Every shift from that feed gets tagged with the
          employer name you provide.
        </p>
        <CalendarSection feeds={feeds} />
      </section>

      <section className="glass mb-5 rounded-2xl p-5">
        <h2 className="mb-1 text-sm font-semibold">Employers</h2>
        <p className="mb-3 text-sm text-slate-400">
          Rename auto-detected employer names. Every existing and future shift
          for that employer updates instantly.
        </p>
        <EmployersSection employers={employers} />
      </section>

      <section className="glass mb-5 rounded-2xl p-5">
        <h2 className="mb-3 text-sm font-semibold">Gmail auto-forward setup</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300 marker:text-emerald-400">
          <li>
            Gmail → Settings → Forwarding and POP/IMAP → Add forwarding address.
          </li>
          <li>
            Paste the VisaGuard inbox above, verify the confirmation code.
          </li>
          <li>
            Settings → Filters → Create a new filter. Use{" "}
            <span className="font-mono text-slate-200">
              from:(rosters@yourjob.com)
            </span>{" "}
            or subject match.
          </li>
          <li>
            <em>Forward to</em> your VisaGuard inbox. Done — rosters auto-flow.
          </li>
        </ol>
      </section>

      <section className="glass rounded-2xl p-5">
        <h2 className="mb-3 text-sm font-semibold">Account</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-400">Email</dt>
            <dd className="truncate text-slate-200">{me.email}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-400">University</dt>
            <dd className="truncate text-slate-200">
              {me.university || "—"}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-slate-500">
          Semester editing lands in a future update. Ping if you need one
          changed now.
        </p>
      </section>
    </main>
  );
}
