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
    <div className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-950/60 p-2">
      <code className="flex-1 break-all text-sm text-emerald-300">{address}</code>
      <button
        type="button"
        onClick={copy}
        className="rounded-md border border-slate-700 px-3 py-1 text-xs hover:border-emerald-500 hover:text-emerald-300"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
