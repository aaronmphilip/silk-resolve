"use client";

export default function TalkButton() {
  return (
    <button
      onClick={() => {
        const sr = (window as { SilkResolve?: { start: () => void } }).SilkResolve;
        if (sr) sr.start();
      }}
      className="inline-flex items-center gap-2 bg-[#0a0a0a] text-white text-sm font-semibold px-7 py-3.5 rounded-full hover:opacity-80 transition-opacity"
    >
      <span>🎙</span> Talk to support now
    </button>
  );
}
