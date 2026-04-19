"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteShiftAction, updateShiftAction } from "@/app/actions";
import type { Shift } from "@/lib/api-server";

const SOURCE_META: Record<
  Shift["source"],
  { label: string; icon: string; cls: string }
> = {
  email: {
    label: "Email",
    icon: "📨",
    cls: "bg-blue-500/15 text-blue-300 ring-blue-500/30",
  },
  calendar: {
    label: "Calendar",
    icon: "📅",
    cls: "bg-purple-500/15 text-purple-300 ring-purple-500/30",
  },
  manual: {
    label: "Manual",
    icon: "✍️",
    cls: "bg-slate-500/15 text-slate-300 ring-slate-500/30",
  },
};

function formatTime(t: string) {
  return t.slice(0, 5);
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm outline-none focus:border-emerald-500/50";

export default function ShiftList({
  shifts,
  emptyHint,
}: {
  shifts: Shift[];
  emptyHint?: string;
}) {
  if (shifts.length === 0) {
    return (
      <div className="glass flex flex-col items-center justify-center rounded-2xl px-6 py-10 text-center">
        <div className="text-3xl">🗓️</div>
        <div className="mt-3 text-sm font-medium text-slate-200">No shifts yet</div>
        <div className="mt-1 max-w-xs text-xs text-slate-400">
          {emptyHint ?? "Forward a roster email or add one manually."}
        </div>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {shifts.map((s) => (
        <ShiftRow key={s.id} shift={s} />
      ))}
    </ul>
  );
}

function ShiftRow({ shift: s }: { shift: Shift }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [startT, setStartT] = useState(formatTime(s.start_time));
  const [endT, setEndT] = useState(formatTime(s.end_time));
  const [breakM, setBreakM] = useState(String(s.break_minutes));
  const [err, setErr] = useState<string | null>(null);

  const meta = SOURCE_META[s.source];
  const d = new Date(s.shift_date);

  const resetForm = () => {
    setStartT(formatTime(s.start_time));
    setEndT(formatTime(s.end_time));
    setBreakM(String(s.break_minutes));
    setErr(null);
  };

  const onDelete = () => {
    if (!confirm("Delete this shift?")) return;
    startTransition(async () => {
      try {
        await deleteShiftAction(s.id);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Delete failed");
      }
    });
  };

  const onSave = () => {
    setErr(null);
    if (!/^\d{2}:\d{2}$/.test(startT) || !/^\d{2}:\d{2}$/.test(endT)) {
      return setErr("Time format HH:MM.");
    }
    const bm = Number(breakM);
    if (!Number.isInteger(bm) || bm < 0 || bm > 480) {
      return setErr("Break 0–480 min.");
    }
    startTransition(async () => {
      try {
        await updateShiftAction(s.id, {
          start_time: startT,
          end_time: endT,
          break_minutes: bm,
        });
        setEditing(false);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Save failed");
      }
    });
  };

  const onResetBreak = () => {
    setErr(null);
    startTransition(async () => {
      try {
        await updateShiftAction(s.id, { break_minutes: null });
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Reset failed");
      }
    });
  };

  return (
    <li className="glass rounded-2xl p-3 transition hover:border-white/15 sm:p-4">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-white/5 py-2 sm:w-14">
          <span className="text-[10px] uppercase tracking-wider text-slate-400">
            {d.toLocaleDateString("en-AU", { weekday: "short" })}
          </span>
          <span className="text-lg font-bold leading-none sm:text-xl">
            {d.getDate()}
          </span>
          <span className="text-[10px] text-slate-400">
            {d.toLocaleDateString("en-AU", { month: "short" })}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">
              {formatTime(s.start_time)} – {formatTime(s.end_time)}
            </span>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/30">
              {s.hours_worked}h
            </span>
            {s.break_minutes > 0 ? (
              <span
                className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-300 ring-1 ring-amber-500/30"
                title={
                  s.break_overridden
                    ? "Manual break override"
                    : "From employer rules"
                }
              >
                ☕ {s.break_minutes}m break
                {s.break_overridden ? " ✎" : ""}
              </span>
            ) : null}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${meta.cls}`}
            >
              <span>{meta.icon}</span>
              {meta.label}
            </span>
          </div>
          {s.employer_name ? (
            <div className="mt-0.5 truncate text-xs text-slate-400">
              {s.employer_name}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => {
              if (editing) {
                resetForm();
                setEditing(false);
              } else {
                setEditing(true);
              }
            }}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label={editing ? "Cancel edit" : "Edit shift"}
          >
            {editing ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 20h4l10-10-4-4L4 16v4zM14 6l4 4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
            aria-label="Delete shift"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 7h16M10 11v6M14 11v6M6 7l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {editing ? (
        <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-[11px] text-slate-400">
                Start
              </label>
              <input
                type="time"
                value={startT}
                onChange={(e) => setStartT(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-slate-400">
                End
              </label>
              <input
                type="time"
                value={endT}
                onChange={(e) => setEndT(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-slate-400">
                Break (min)
              </label>
              <input
                type="number"
                min={0}
                max={480}
                step={5}
                value={breakM}
                onChange={(e) => setBreakM(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={pending}
              className="rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-black hover:bg-emerald-300 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            {s.break_overridden ? (
              <button
                type="button"
                onClick={onResetBreak}
                disabled={pending}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 disabled:opacity-50"
                title="Drop override, use employer rules"
              >
                Use employer rule
              </button>
            ) : null}
          </div>
          {err ? <div className="text-[11px] text-red-400">{err}</div> : null}
          <p className="text-[11px] text-slate-500">
            Manual break value sticks even if employer rules change.
          </p>
        </div>
      ) : null}

      {err && !editing ? (
        <div className="mt-2 text-[11px] text-red-400">{err}</div>
      ) : null}
    </li>
  );
}
