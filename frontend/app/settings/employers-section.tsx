"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { renameEmployerAction } from "@/app/actions";
import type { Employer } from "@/lib/api-server";
import BreakRulesEditor from "./break-rules-editor";

export default function EmployersSection({
  employers,
}: {
  employers: Employer[];
}) {
  if (employers.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        No employers yet. They appear here once shifts come in.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {employers.map((e) => (
        <EmployerRow key={e.id} employer={e} />
      ))}
    </ul>
  );
}

function EmployerRow({ employer }: { employer: Employer }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [showBreaks, setShowBreaks] = useState(false);
  const [value, setValue] = useState(employer.display_name ?? "");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const renamed = Boolean(employer.display_name);

  const save = () => {
    setErr(null);
    const trimmed = value.trim();
    const next = trimmed.length === 0 ? null : trimmed;
    if ((next ?? "") === (employer.display_name ?? "")) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      try {
        await renameEmployerAction(employer.id, next);
        setEditing(false);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Rename failed");
      }
    });
  };

  const reset = () => {
    startTransition(async () => {
      try {
        await renameEmployerAction(employer.id, null);
        setValue("");
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Reset failed");
      }
    });
  };

  return (
    <li className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
          🏷️
        </span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={value}
                autoFocus
                onChange={(ev) => setValue(ev.target.value)}
                placeholder="e.g. Woolies"
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-emerald-500/50"
                onKeyDown={(ev) => {
                  if (ev.key === "Enter") save();
                  if (ev.key === "Escape") {
                    setEditing(false);
                    setValue(employer.display_name ?? "");
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={save}
                  disabled={pending}
                  className="rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-black hover:bg-emerald-300 disabled:opacity-50"
                >
                  {pending ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setValue(employer.display_name ?? "");
                    setErr(null);
                  }}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
              {err ? (
                <div className="text-xs text-red-400">{err}</div>
              ) : null}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{employer.resolved_name}</span>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-slate-400">
                  {employer.shift_count}{" "}
                  {employer.shift_count === 1 ? "shift" : "shifts"}
                </span>
                {renamed ? (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-300 ring-1 ring-emerald-500/30">
                    renamed
                  </span>
                ) : null}
              </div>
              {renamed ? (
                <div className="mt-0.5 truncate text-xs text-slate-500">
                  auto-detected as{" "}
                  <span className="font-mono">{employer.name}</span>
                </div>
              ) : (
                <div className="mt-0.5 truncate text-xs text-slate-500">
                  auto-detected name
                </div>
              )}
            </>
          )}
        </div>

        {!editing ? (
          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            <button
              type="button"
              onClick={() => {
                setValue(employer.display_name ?? "");
                setEditing(true);
              }}
              className="rounded-lg px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/10 hover:text-white"
            >
              {renamed ? "Edit" : "Rename"}
            </button>
            <button
              type="button"
              onClick={() => setShowBreaks((v) => !v)}
              className="rounded-lg px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/10 hover:text-white"
            >
              {showBreaks ? "Hide breaks" : "Breaks"}
            </button>
            {renamed ? (
              <button
                type="button"
                onClick={reset}
                disabled={pending}
                className="rounded-lg px-2.5 py-1.5 text-xs text-slate-500 hover:bg-white/10 hover:text-slate-200 disabled:opacity-50"
                title="Revert to auto-detected name"
              >
                Reset
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {showBreaks ? (
        <BreakRulesEditor
          employerId={employer.id}
          employerName={employer.resolved_name}
          onClose={() => setShowBreaks(false)}
        />
      ) : null}
    </li>
  );
}
