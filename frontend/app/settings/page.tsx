import Link from "next/link";
import { api } from "@/lib/api-server";
import InboxCopy from "./inbox-copy";
import CalendarSection from "./calendar-section";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [me, calendarStatus] = await Promise.all([
    api.me(),
    api.calendarStatus(),
  ]);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm text-slate-400 hover:text-slate-200">
          ← Dashboard
        </Link>
      </div>
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>

      <section className="mb-8 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="mb-2 text-sm font-medium">Your forwarding inbox</h2>
        <p className="mb-3 text-sm text-slate-400">
          Any email sent here will be parsed into shifts.
        </p>
        <InboxCopy address={me.unique_inbox} />
      </section>

      <section className="mb-8 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="mb-2 text-sm font-medium">Roster calendar feed (ICS)</h2>
        <CalendarSection status={calendarStatus} />
      </section>

      <section className="mb-8 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="mb-2 text-sm font-medium">Gmail auto-forward setup</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
          <li>
            Gmail → Settings → Forwarding and POP/IMAP → Add a forwarding address.
          </li>
          <li>
            Paste your VisaGuard inbox above, verify the confirmation code we
            receive.
          </li>
          <li>
            Settings → Filters and Blocked Addresses → Create a new filter. Use{" "}
            <span className="font-mono text-slate-200">
              from:(rosters@yourjob.com)
            </span>{" "}
            or a subject match.
          </li>
          <li>
            Choose <em>Forward to</em> your VisaGuard inbox. Done — rosters auto-flow in.
          </li>
        </ol>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="mb-2 text-sm font-medium">Account</h2>
        <div className="space-y-2 text-sm text-slate-300">
          <div>
            <span className="text-slate-400">Email:</span> {me.email}
          </div>
          <div>
            <span className="text-slate-400">University:</span>{" "}
            {me.university || "—"}
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Semester period editing lands in a future update. Ping if you need one
          changed now.
        </p>
      </section>
    </main>
  );
}
