"use client";

import { useState } from "react";

export default function InboxCopy({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/30 p-2 sm:flex-row sm:items-center">
      <code className="flex-1 break-all px-2 py-1 font-mono text-sm text-emerald-300">
        {address}
      </code>
      <button
        type="button"
        onClick={copy}
        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
          copied
            ? "bg-emerald-500/20 text-emerald-300"
            : "bg-white/5 text-slate-200 hover:bg-white/10"
        }`}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
