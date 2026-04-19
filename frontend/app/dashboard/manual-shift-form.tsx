"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createShiftAction } from "@/app/actions";

export default function ManualShiftForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    employer_name: "",
    shift_date: "",
    start_time: "",
    end_time: "",
  });

  const update = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const reset = () => {
    setForm({ employer_name: "", shift_date: "", start_time: "", end_time: "" });
    setError(null);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.start_time >= form.end_time) {
      setError("End time must be after start time.");
      return;
    }
    startTransition(async () => {
      try {
        await createShiftAction(form);
        reset();
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add shift");
      }
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group glass flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-emerald-500/40 hover:text-emerald-300"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 transition group-hover:bg-emerald-500/30">
          +
        </span>
        Add shift manually
      </button>
    );
  }

  const inputCls =
    "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none transition focus:border-emerald-500/50 focus:bg-white/10";

  return (
    <form
      onSubmit={onSubmit}
      className="glass space-y-3 rounded-2xl p-4 sm:p-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Add a shift</h3>
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-slate-200"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-400">Employer</label>
        <input
          type="text"
          value={form.employer_name}
          onChange={(e) => update("employer_name", e.target.value)}
          className={inputCls}
          placeholder="e.g. Woolworths"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-slate-400">Date</label>
        <input
          type="date"
          value={form.shift_date}
          onChange={(e) => update("shift_date", e.target.value)}
          className={inputCls}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-slate-400">Start</label>
          <input
            type="time"
            value={form.start_time}
            onChange={(e) => update("start_time", e.target.value)}
            className={inputCls}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">End</label>
          <input
            type="time"
            value={form.end_time}
            onChange={(e) => update("end_time", e.target.value)}
            className={inputCls}
            required
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-2.5 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-black shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save shift"}
        </button>
      </div>
    </form>
  );
}
