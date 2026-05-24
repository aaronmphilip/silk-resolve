"use client";

import dynamic from "next/dynamic";

const ObserverClient = dynamic(
  () => import("@/components/observer/ObserverClient"),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center">
        <p className="font-mono text-xs opacity-30 animate-pulse">
          initialising observer...
        </p>
      </div>
    ),
  }
);

export default function ObserverClientLoader() {
  return <ObserverClient />;
}
