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
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="rounded-md border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-300">
        Signed in as <span className="font-medium text-slate-100">{defaultEmail}</span>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">University</label>
        <select
          value={university}
          onChange={(e) => setUniversity(e.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2"
        >
          {UNIVERSITIES.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="block text-sm font-medium">Semester periods</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => addRow(true)}
              className="rounded border border-slate-700 px-2 py-1 text-xs hover:border-slate-500"
            >
              + Semester
            </button>
            <button
              type="button"
              onClick={() => addRow(false)}
              className="rounded border border-slate-700 px-2 py-1 text-xs hover:border-slate-500"
            >
              + Break
            </button>
          </div>
        </div>
        <p className="mb-3 text-xs text-slate-400">
          48-hour fortnightly cap applies only when <em>semester</em> is on. Breaks = unlimited.
        </p>

        <div className="space-y-3">
          {rows.map((r, i) => (
            <div
              key={i}
              className="rounded-md border border-slate-800 bg-slate-900/40 p-3"
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Start</label>
                  <input
                    type="date"
                    value={r.start_date}
                    onChange={(e) => updateRow(i, { start_date: e.target.value })}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">End</label>
                  <input
                    type="date"
                    value={r.end_date}
                    onChange={(e) => updateRow(i, { end_date: e.target.value })}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm"
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
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm"
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
        className="w-full rounded-md bg-emerald-500 px-4 py-2 font-medium text-black hover:bg-emerald-400 disabled:opacity-50"
      >
        {pending ? "Saving..." : "Finish setup"}
      </button>
    </form>
  );
}
