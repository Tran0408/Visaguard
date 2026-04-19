"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteShiftAction } from "@/app/actions";
import type { Shift } from "@/lib/api-server";

const SOURCE_BADGE: Record<Shift["source"], { label: string; cls: string }> = {
  email: { label: "Email", cls: "bg-blue-500/20 text-blue-300" },
  calendar: { label: "Calendar", cls: "bg-purple-500/20 text-purple-300" },
  manual: { label: "Manual", cls: "bg-slate-500/20 text-slate-300" },
};

function formatTime(t: string) {
  return t.slice(0, 5);
}

export default function ShiftList({ shifts }: { shifts: Shift[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const onDelete = (id: string) => {
    if (!confirm("Delete this shift?")) return;
    setRemovingId(id);
    startTransition(async () => {
      try {
        await deleteShiftAction(id);
        router.refresh();
      } finally {
        setRemovingId(null);
      }
    });
  };

  if (shifts.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6 text-center text-sm text-slate-400">
        No shifts yet. Forward a roster email or add one manually.
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-800 overflow-hidden rounded-lg border border-slate-800 bg-slate-900/40">
      {shifts.map((s) => {
        const badge = SOURCE_BADGE[s.source];
        const isRemoving = removingId === s.id && pending;
        return (
          <div key={s.id} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {new Date(s.shift_date).toLocaleDateString("en-AU", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
              <div className="mt-1 text-sm text-slate-400">
                {formatTime(s.start_time)} – {formatTime(s.end_time)} ·{" "}
                <span className="text-slate-300">{s.hours_worked}h</span>
                {s.employer_name ? ` · ${s.employer_name}` : ""}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onDelete(s.id)}
              disabled={isRemoving}
              className="text-xs text-slate-400 hover:text-red-400 disabled:opacity-50"
            >
              {isRemoving ? "…" : "Delete"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
