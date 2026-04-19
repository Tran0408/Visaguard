"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  getBreakRulesAction,
  saveBreakRulesAction,
} from "@/app/actions";

type Draft = {
  key: string;
  min_shift_hours: string;
  unpaid_break_minutes: string;
};

let counter = 0;
const newKey = () => `r${++counter}`;

const inputCls =
  "w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-sm outline-none transition focus:border-emerald-500/50 focus:bg-white/5";

export default function BreakRulesEditor({
  employerId,
  employerName,
  onClose,
}: {
  employerId: string;
  employerName: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getBreakRulesAction(employerId)
      .then((rules) => {
        if (cancelled) return;
        const mapped: Draft[] = rules.map((r) => ({
          key: newKey(),
          min_shift_hours: String(Number(r.min_shift_hours)),
          unpaid_break_minutes: String(r.unpaid_break_minutes),
        }));
        setDrafts(
          mapped.length > 0
            ? mapped
            : [{ key: newKey(), min_shift_hours: "5", unpaid_break_minutes: "30" }],
        );
        setLoaded(true);
      })
      .catch((e) => {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Load failed");
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [employerId]);

  const addRow = () =>
    setDrafts((d) => [
      ...d,
      { key: newKey(), min_shift_hours: "", unpaid_break_minutes: "" },
    ]);

  const removeRow = (key: string) =>
    setDrafts((d) => d.filter((r) => r.key !== key));

  const updateRow = (key: string, field: keyof Draft, value: string) =>
    setDrafts((d) =>
      d.map((r) => (r.key === key ? { ...r, [field]: value } : r)),
    );

  const save = () => {
    setErr(null);
    setMsg(null);

    const rules: { min_shift_hours: number; unpaid_break_minutes: number }[] = [];
    for (const d of drafts) {
      const hStr = d.min_shift_hours.trim();
      const mStr = d.unpaid_break_minutes.trim();
      if (!hStr && !mStr) continue;
      const h = Number(hStr);
      const m = Number(mStr);
      if (!Number.isFinite(h) || h <= 0 || h > 24) {
        return setErr("Shift hours must be between 0 and 24.");
      }
      if (!Number.isInteger(m) || m < 0 || m > 480) {
        return setErr("Break minutes must be 0–480.");
      }
      rules.push({ min_shift_hours: h, unpaid_break_minutes: m });
    }

    startTransition(async () => {
      try {
        const r = await saveBreakRulesAction(employerId, rules);
        setMsg(
          `Saved · recomputed ${r.shifts_recomputed} shift${r.shifts_recomputed === 1 ? "" : "s"}.`,
        );
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Save failed");
      }
    });
  };

  if (!loaded) {
    return (
      <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-400">
        Loading break rules…
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-200">
            Unpaid breaks · {employerName}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            When a shift is ≥ X hours, subtract Y minutes as unpaid break. Longest
            matching threshold wins.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-white/10 hover:text-white"
        >
          Close
        </button>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-[11px] text-slate-500">
          <span>Shift ≥ hours</span>
          <span>Unpaid minutes</span>
          <span />
        </div>
        {drafts.length === 0 ? (
          <p className="text-[11px] text-slate-500">
            No rules. All shift time counts toward the 48-hour limit.
          </p>
        ) : (
          drafts.map((d) => (
            <div
              key={d.key}
              className="grid grid-cols-[1fr_1fr_auto] items-center gap-2"
            >
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={24}
                step={0.5}
                value={d.min_shift_hours}
                placeholder="5"
                onChange={(e) =>
                  updateRow(d.key, "min_shift_hours", e.target.value)
                }
                className={inputCls}
              />
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={480}
                step={5}
                value={d.unpaid_break_minutes}
                placeholder="30"
                onChange={(e) =>
                  updateRow(d.key, "unpaid_break_minutes", e.target.value)
                }
                className={inputCls}
              />
              <button
                type="button"
                onClick={() => removeRow(d.key)}
                className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                aria-label="Remove rule"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={addRow}
          className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs hover:bg-white/15"
        >
          + Add rule
        </button>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-black hover:bg-emerald-300 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save & recompute"}
        </button>
      </div>

      {msg ? <div className="text-[11px] text-emerald-300">{msg}</div> : null}
      {err ? <div className="text-[11px] text-red-400">{err}</div> : null}
    </div>
  );
}
