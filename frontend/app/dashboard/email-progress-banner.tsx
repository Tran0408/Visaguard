"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getRecentEmailLogsAction } from "@/app/actions";
import type { EmailLogItem } from "@/lib/api-server";

const IN_PROGRESS = new Set(["received", "queued"]);

type FlashKind = "success" | "empty" | "error";

type Flash = {
  kind: FlashKind;
  message: string;
  key: string;
};

function describeLog(log: EmailLogItem): string {
  const from = log.from_address || "email";
  if (log.status === "processed") {
    const n = log.shifts_extracted;
    return `Added ${n} shift${n === 1 ? "" : "s"} from ${from}`;
  }
  if (log.status === "no_shifts_found") {
    return `No shifts detected in email from ${from}`;
  }
  if (log.status === "error") {
    return `Couldn't parse email from ${from}${
      log.error_message ? `: ${log.error_message.slice(0, 120)}` : ""
    }`;
  }
  return `Processing email from ${from}…`;
}

export default function EmailProgressBanner() {
  const router = useRouter();
  const [inProgress, setInProgress] = useState<EmailLogItem[]>([]);
  const [flash, setFlash] = useState<Flash | null>(null);
  const prevStatusRef = useRef<Map<string, string>>(new Map());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let stop = false;

    const tick = async () => {
      try {
        const logs = await getRecentEmailLogsAction();
        if (stop || !mountedRef.current) return;

        const prev = prevStatusRef.current;
        const next = new Map<string, string>();
        let refreshNeeded = false;
        let latestTransition: EmailLogItem | null = null;

        for (const log of logs) {
          const status = log.status || "";
          next.set(log.id, status);
          const wasInProgress = prev.has(log.id)
            ? IN_PROGRESS.has(prev.get(log.id) || "")
            : false;
          const nowTerminal = !IN_PROGRESS.has(status);
          if (wasInProgress && nowTerminal) {
            refreshNeeded = true;
            if (!latestTransition) latestTransition = log;
          }
        }

        prevStatusRef.current = next;
        setInProgress(logs.filter((l) => IN_PROGRESS.has(l.status || "")));

        if (refreshNeeded && latestTransition) {
          const kind: FlashKind =
            latestTransition.status === "processed"
              ? "success"
              : latestTransition.status === "no_shifts_found"
                ? "empty"
                : "error";
          setFlash({
            kind,
            message: describeLog(latestTransition),
            key: latestTransition.id,
          });
          router.refresh();
        }
      } catch {
        // swallow — polling keeps going
      }
    };

    void tick();
    const interval = window.setInterval(tick, 4000);
    return () => {
      stop = true;
      mountedRef.current = false;
      window.clearInterval(interval);
    };
  }, [router]);

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 8000);
    return () => window.clearTimeout(t);
  }, [flash]);

  if (inProgress.length === 0 && !flash) return null;

  return (
    <div className="mb-4 space-y-2">
      {inProgress.map((log) => (
        <div
          key={log.id}
          className="overflow-hidden rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3"
        >
          <div className="flex items-center justify-between gap-3 text-sm text-emerald-200">
            <span>{describeLog(log)}</span>
            <span className="text-xs text-emerald-300/70">working…</span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded bg-emerald-500/20">
            <div className="h-full w-1/3 animate-[progress_1.2s_ease-in-out_infinite] bg-emerald-400" />
          </div>
        </div>
      ))}

      {flash ? (
        <div
          key={flash.key}
          className={`rounded-lg border px-4 py-3 text-sm ${
            flash.kind === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : flash.kind === "empty"
                ? "border-slate-700 bg-slate-800/60 text-slate-300"
                : "border-red-500/30 bg-red-500/10 text-red-200"
          }`}
        >
          {flash.message}
        </div>
      ) : null}

      <style jsx>{`
        @keyframes progress {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }
      `}</style>
    </div>
  );
}
