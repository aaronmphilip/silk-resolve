"use client";

import dynamic from "next/dynamic";

const CanvasClient = dynamic(
  () => import("@/components/canvas/CanvasClient"),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center">
        <p className="font-mono text-xs opacity-30">loading canvas...</p>
      </div>
    ),
  }
);

export default function CanvasClientLoader() {
  return <CanvasClient />;
}
