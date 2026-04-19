import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { api } from "@/lib/api-server";
import ProgressRing from "./progress-ring";
import ShiftList from "./shift-list";
import ManualShiftForm from "./manual-shift-form";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const me = await api.me();
  if (!me.onboarded) redirect("/onboarding");

  const [summary, shifts] = await Promise.all([
    api.fortnightly(),
    api.listShifts(),
  ]);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">VisaGuard</h1>
          <p className="text-sm text-slate-400">
            Forward shifts to{" "}
            <span className="font-mono text-slate-200">{me.unique_inbox}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="text-sm text-slate-300 hover:text-emerald-300"
          >
            Settings
          </Link>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-[auto_1fr]">
        <ProgressRing summary={summary} />

        <div className="space-y-4">
          <div>
            <h2 className="mb-2 text-sm font-medium text-slate-300">
              Recent shifts
            </h2>
            <ShiftList shifts={shifts} />
          </div>
          <ManualShiftForm />
        </div>
      </div>
    </main>
  );
}
