"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  disconnectCalendarAction,
  saveIcsUrlAction,
  syncCalendarAction,
} from "@/app/actions";
import type { CalendarStatus } from "@/lib/api-server";

export default function CalendarSection({ status }: { status: CalendarStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    const trimmed = url.trim();
    if (!trimmed) {
      setErr("Paste feed URL first.");
      return;
    }
    startTransition(async () => {
      try {
        const r = await saveIcsUrlAction(trimmed);
        if (r.sync_error) {
          setMsg(`Saved, but first sync failed: ${r.sync_error}`);
        } else {
          setMsg(
            `Connected · scanned ${r.scanned ?? 0} events · ${r.inserted ?? 0} shift${r.inserted === 1 ? "" : "s"} added.`,
          );
        }
        setUrl("");
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Save failed");
      }
    });
  };

  const onSync = () => {
    setMsg(null);
    setErr(null);
    startTransition(async () => {
      try {
        const r = await syncCalendarAction();
        setMsg(
          `Scanned ${r.scanned} events · ${r.inserted} new shift${r.inserted === 1 ? "" : "s"} added.`,
        );
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Sync failed");
      }
    });
  };

  const onDisconnect = () => {
    if (!confirm("Disconnect calendar feed? Existing shifts stay.")) return;
    setMsg(null);
    setErr(null);
    startTransition(async () => {
      try {
        await disconnectCalendarAction();
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Disconnect failed");
      }
    });
  };

  if (status.connected) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-emerald-300">● Connected</div>
        <div className="rounded bg-slate-950/40 px-3 py-2 font-mono text-xs text-slate-400">
          {status.ics_url_masked}
        </div>
        {status.last_synced_at && (
          <div className="text-xs text-slate-500">
            Last sync: {new Date(status.last_synced_at).toLocaleString("en-AU")}
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSync}
            disabled={pending}
            className="rounded bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
          >
            {pending ? "Syncing…" : "Sync now"}
          </button>
          <button
            type="button"
            onClick={onDisconnect}
            disabled={pending}
            className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-red-500 hover:text-red-400 disabled:opacity-50"
          >
            Disconnect
          </button>
        </div>
        {msg && <div className="text-xs text-emerald-300">{msg}</div>}
        {err && <div className="text-xs text-red-400">{err}</div>}
      </div>
    );
  }

  return (
    <form onSubmit={onSave} className="space-y-3">
      <p className="text-sm text-slate-400">
        Paste your roster calendar feed URL (Humanforce, Deputy, Google Calendar
        secret iCal, etc). Starts with <span className="font-mono">https://</span>{" "}
        or <span className="font-mono">webcal://</span>.
      </p>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://…/calendar.ics"
        className="w-full rounded border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
      >
        {pending ? "Validating…" : "Connect feed"}
      </button>
      <details className="text-xs text-slate-500">
        <summary className="cursor-pointer hover:text-slate-300">
          Where do I get this URL?
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <b>Humanforce:</b> Profile → My Details → Calendar Feed → copy URL.
          </li>
          <li>
            <b>Deputy:</b> Me → Calendar Sync → copy iCal URL.
          </li>
          <li>
            <b>Google Calendar:</b> Settings → pick roster calendar → Secret
            address in iCal format.
          </li>
        </ul>
      </details>
      {msg && <div className="text-xs text-emerald-300">{msg}</div>}
      {err && <div className="text-xs text-red-400">{err}</div>}
    </form>
  );
}
