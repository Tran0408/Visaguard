"use client";

import { useState } from "react";

export default function InboxPill({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="glass mb-5 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition hover:border-white/15 active:scale-[0.99]"
      title="Copy forwarding inbox"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
        📨
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wider text-slate-400">
          Your forwarding inbox
        </div>
        <div className="truncate font-mono text-xs text-slate-100 sm:text-sm">
          {address}
        </div>
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
          copied
            ? "bg-emerald-500/20 text-emerald-300"
            : "bg-white/5 text-slate-300 hover:bg-white/10"
        }`}
      >
        {copied ? "Copied" : "Copy"}
      </span>
    </button>
  );
}
