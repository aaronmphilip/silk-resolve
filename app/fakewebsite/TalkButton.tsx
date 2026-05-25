"use client";

import { PhoneCall } from "lucide-react";

export default function TalkButton({ label = "Talk to support now" }: { label?: string }) {
  return (
    <button
      onClick={() => {
        const sr = (window as { SilkResolve?: { start: () => void } }).SilkResolve;
        if (sr) sr.start();
      }}
      className="inline-flex items-center gap-2 bg-[#0a0a0a] text-white text-sm font-semibold px-7 py-3.5 rounded-full hover:opacity-80 transition-opacity"
    >
      <PhoneCall aria-hidden="true" className="h-4 w-4" />
      {label}
    </button>
  );
}
