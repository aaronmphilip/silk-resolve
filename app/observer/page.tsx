import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ObserverClientLoader from "./ObserverClientLoader";

export default function ObserverPage() {
  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{
        backgroundColor: "#f0ebe0",
        backgroundImage:
          "radial-gradient(rgba(0,0,0,0.1) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }}
    >
      {/* Decorative binary */}
      <div className="fixed top-3 right-4 pointer-events-none select-none opacity-[0.12] font-mono text-[10px] leading-relaxed text-right z-0">
        <div>11111111</div>
        <div>1110011</div>
        <div>000 10</div>
        <div>11111</div>
        <div>0000000</div>
      </div>

      {/* Top bar */}
      <div className="border-b border-black px-6 py-3 flex items-center justify-between bg-transparent relative z-10 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs opacity-50 hover:opacity-100 transition-opacity font-mono"
          >
            <ArrowLeft size={12} />
            back
          </Link>
          <div className="w-px h-4 bg-black/20" />
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-black" />
              <div className="w-2 h-2 rounded-full bg-black absolute inset-0 animate-ping opacity-60" />
            </div>
            <span className="font-semibold text-sm">live observer</span>
          </div>
          <span className="text-[10px] font-mono opacity-35">
            · MedCore Billing Agent · SR-2842 · Apollo Healthcare
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] font-mono opacity-40">
            <span>PEEK</span>
            <span className="opacity-30">·</span>
            <span>MESH</span>
            <span className="opacity-30">·</span>
            <span>SILK</span>
          </div>
          <span className="text-[10px] font-mono border border-black px-2.5 py-1 font-bold">
            LIVE
          </span>
        </div>
      </div>

      {/* Observer client */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        <ObserverClientLoader />
      </div>
    </div>
  );
}
