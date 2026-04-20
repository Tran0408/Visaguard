"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeSetupAction } from "@/app/actions";
import type { SemesterPeriodIn } from "@/lib/api-server";

const UNIVERSITIES = [
  { value: "USYD", label: "University of Sydney" },
  { value: "UNSW", label: "UNSW Sydney" },
  { value: "UTS", label: "University of Technology Sydney" },
  { value: "MQ", label: "Macquarie University" },
  { value: "WSU", label: "Western Sydney University" },
  { value: "OTHER", label: "Other" },
];

type Row = {
  start_date: string;
  end_date: string;
  is_semester: boolean;
  label: string;
};

const blankRow = (is_semester: boolean): Row => ({
  start_date: "",
  end_date: "",
  is_semester,
  label: "",
});

export default function OnboardingForm({ defaultEmail }: { defaultEmail: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [university, setUniversity] = useState("USYD");
  const [rows, setRows] = useState<Row[]>([blankRow(true)]);
  const [error, setError] = useState<string | null>(null);

  const updateRow = (i: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const addRow = (is_semester: boolean) =>
    setRows((prev) => [...prev, blankRow(is_semester)]);

  const removeRow = (i: number) =>
    setRows((prev) => prev.filter((_, idx) => idx !== i));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    for (const r of rows) {
      if (!r.start_date || !r.end_date) {
        setError("Every period needs a start and end date.");
        return;
      }
      if (r.start_date > r.end_date) {
        setError("Start date must be on or before end date.");
        return;
      }
    }

    const semester_periods: SemesterPeriodIn[] = rows.map((r) => ({
      start_date: r.start_date,
      end_date: r.end_date,
      is_semester: r.is_semester,
      label: r.label || null,
    }));

    startTransition(async () => {
      try {
        await completeSetupAction({ university, semester_periods });
        router.push("/dashboard");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Setup failed");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5 sm:space-y-6">
      <div className="glass rounded-2xl p-3 text-sm leading-6 text-slate-300 sm:p-4">
        Signed in as{" "}
        <span className="break-all font-medium text-slate-100">
          {defaultEmail}
        </span>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">University</label>
        <select
          value={university}
          onChange={(e) => setUniversity(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-emerald-500/50"
        >
          {UNIVERSITIES.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="block text-sm font-medium">Semester periods</label>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              onClick={() => addRow(true)}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-2 text-xs hover:bg-white/10 sm:py-1"
            >
              + Semester
            </button>
            <button
              type="button"
              onClick={() => addRow(false)}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-2 text-xs hover:bg-white/10 sm:py-1"
            >
              + Break
            </button>
          </div>
        </div>
        <p className="mb-3 text-xs leading-5 text-slate-400">
          48-hour fortnightly cap applies only when <em>semester</em> is on. Breaks = unlimited.
        </p>

        <div className="space-y-3 sm:space-y-4">
          {rows.map((r, i) => (
            <div
              key={i}
              className="glass rounded-2xl p-3 sm:p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    r.is_semester
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-slate-700/50 text-slate-300"
                  }`}
                >
                  {r.is_semester ? "Semester" : "Break"}
                </span>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="text-xs text-slate-400 hover:text-red-400"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Start</label>
                  <input
                    type="date"
                    value={r.start_date}
                    onChange={(e) => updateRow(i, { start_date: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-emerald-500/50"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">End</label>
                  <input
                    type="date"
                    value={r.end_date}
                    onChange={(e) => updateRow(i, { end_date: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-emerald-500/50"
                    required
                  />
                </div>
              </div>
              <div className="mt-2">
                <label className="mb-1 block text-xs text-slate-400">
                  Label (optional)
                </label>
                <input
                  type="text"
                  value={r.label}
                  placeholder={r.is_semester ? "Sem 1 2026" : "Winter break"}
                  onChange={(e) => updateRow(i, { label: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-300 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Finish setup"}
      </button>
    </form>
  );
}
