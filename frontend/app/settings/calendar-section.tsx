"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addCalendarFeedAction,
  deleteCalendarFeedAction,
  syncAllCalendarFeedsAction,
  syncCalendarFeedAction,
  updateCalendarFeedAction,
} from "@/app/actions";
import type { CalendarFeed } from "@/lib/api-server";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-emerald-500/50 focus:bg-white/5";

export default function CalendarSection({ feeds }: { feeds: CalendarFeed[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(feeds.length === 0);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const resetForm = () => {
    setUrl("");
    setLabel("");
    setErr(null);
  };

  const onAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    const u = url.trim();
    const l = label.trim();
    if (!u) return setErr("Paste feed URL.");
    if (!l) return setErr("Employer name required.");
    startTransition(async () => {
      try {
        const r = await addCalendarFeedAction({ url: u, employer_label: l });
        if (r.sync_error) {
          setMsg(`Saved, first sync failed: ${r.sync_error}`);
        } else {
          setMsg(
            `Added · scanned ${r.scanned ?? 0} events · ${r.inserted ?? 0} shift${r.inserted === 1 ? "" : "s"} added.`,
          );
        }
        resetForm();
        setAdding(false);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Save failed");
      }
    });
  };

  const onSyncAll = () => {
    setMsg(null);
    setErr(null);
    startTransition(async () => {
      try {
        const r = await syncAllCalendarFeedsAction();
        setMsg(
          `Synced ${r.feeds} feed${r.feeds === 1 ? "" : "s"} · ${r.inserted} new shift${r.inserted === 1 ? "" : "s"}.`,
        );
        if (r.errors.length) {
          setErr(`${r.errors.length} feed(s) failed.`);
        }
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Sync failed");
      }
    });
  };

  return (
    <div className="space-y-4">
      {feeds.length > 0 ? (
        <ul className="space-y-2">
          {feeds.map((f) => (
            <FeedRow key={f.id} feed={f} />
          ))}
        </ul>
      ) : null}

      {feeds.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
          >
            {adding ? "Close" : "+ Add another feed"}
          </button>
          <button
            type="button"
            onClick={onSyncAll}
            disabled={pending}
            className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/10 disabled:opacity-50"
          >
            {pending ? "Syncing…" : "Sync all"}
          </button>
        </div>
      ) : null}

      {adding ? (
        <form onSubmit={onAdd} className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Employer name for this feed
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Woolies"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Roster calendar feed URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…/calendar.ics"
              className={inputCls}
            />
          </div>
          <p className="text-xs text-slate-500">
            Humanforce, Deputy, Google Calendar secret iCal. Starts with{" "}
            <span className="font-mono">https://</span> or{" "}
            <span className="font-mono">webcal://</span>.
          </p>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-300 disabled:opacity-50 sm:w-auto"
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
        </form>
      ) : null}

      {msg ? <div className="text-xs text-emerald-300">{msg}</div> : null}
      {err ? <div className="text-xs text-red-400">{err}</div> : null}
    </div>
  );
}

function FeedRow({ feed }: { feed: CalendarFeed }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(feed.employer_label);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const saveLabel = () => {
    const next = label.trim();
    if (!next || next === feed.employer_label) {
      setEditing(false);
      return;
    }
    setErr(null);
    startTransition(async () => {
      try {
        await updateCalendarFeedAction(feed.id, next);
        setEditing(false);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Update failed");
      }
    });
  };

  const onSync = () => {
    setErr(null);
    setMsg(null);
    startTransition(async () => {
      try {
        const r = await syncCalendarFeedAction(feed.id);
        setMsg(
          `Scanned ${r.scanned} · ${r.inserted} new shift${r.inserted === 1 ? "" : "s"}.`,
        );
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Sync failed");
      }
    });
  };

  const onDelete = () => {
    if (!confirm(`Remove feed for "${feed.employer_label}"? Existing shifts stay.`))
      return;
    setErr(null);
    startTransition(async () => {
      try {
        await deleteCalendarFeedAction(feed.id);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Delete failed");
      }
    });
  };

  return (
    <li className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 text-purple-300">
          📅
        </span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={label}
                autoFocus
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveLabel();
                  if (e.key === "Escape") {
                    setEditing(false);
                    setLabel(feed.employer_label);
                  }
                }}
                className={inputCls}
              />
              <button
                type="button"
                onClick={saveLabel}
                disabled={pending}
                className="rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-black hover:bg-emerald-300 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{feed.employer_label}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Connected
                </span>
              </div>
              <div className="mt-0.5 truncate font-mono text-[11px] text-slate-500">
                {feed.ics_url_masked}
              </div>
              {feed.last_synced_at ? (
                <div className="mt-0.5 text-[11px] text-slate-500">
                  Last sync:{" "}
                  {new Date(feed.last_synced_at).toLocaleString("en-AU")}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      {!editing ? (
        <div className="mt-2 flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => {
              setLabel(feed.employer_label);
              setEditing(true);
            }}
            className="rounded-lg px-2.5 py-1 text-xs text-slate-300 hover:bg-white/10 hover:text-white"
          >
            Rename
          </button>
          <button
            type="button"
            onClick={onSync}
            disabled={pending}
            className="rounded-lg px-2.5 py-1 text-xs text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            {pending ? "Syncing…" : "Sync"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="rounded-lg px-2.5 py-1 text-xs text-slate-500 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      ) : null}

      {msg ? <div className="mt-2 text-xs text-emerald-300">{msg}</div> : null}
      {err ? <div className="mt-2 text-xs text-red-400">{err}</div> : null}
    </li>
  );
}
