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
        className="w-full rounded-md border border-dashed border-slate-700 px-4 py-3 text-sm text-slate-300 hover:border-emerald-500 hover:text-emerald-300"
      >
        + Add shift manually
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-md border border-slate-800 bg-slate-900/40 p-4"
    >
      <div>
        <label className="mb-1 block text-xs text-slate-400">Employer</label>
        <input
          type="text"
          value={form.employer_name}
          onChange={(e) => update("employer_name", e.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm"
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
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm"
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
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">End</label>
          <input
            type="time"
            value={form.end_time}
            onChange={(e) => update("end_time", e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm"
            required
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400 disabled:opacity-50"
        >
          {pending ? "Saving..." : "Add shift"}
        </button>
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="rounded-md border border-slate-700 px-4 py-2 text-sm hover:border-slate-500"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
