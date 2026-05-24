"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const INNER_BARS = [3, 5, 8, 12, 16, 12, 8, 5, 3, 5, 8, 12, 8, 5, 3];
const OUTER_BARS = 32;

function randomise(h: number) {
  return Math.max(8, Math.min(96, h + (Math.random() - 0.5) * 28));
}

const BASE = Array.from({ length: OUTER_BARS }, (_, i) => {
  const t = i / OUTER_BARS;
  return 18 + Math.sin(t * Math.PI * 4) * 36 + Math.cos(t * Math.PI * 2) * 18;
});

export function VoiceOrb({ size = 300 }: { size?: number }) {
  const [outerH, setOuterH] = useState(BASE);

  /* Live-randomise outer bars every 120 ms to look like real audio */
  useEffect(() => {
    const id = setInterval(() =>
      setOuterH(prev => prev.map(randomise)), 120);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative flex flex-col items-center">
      {/* ── Outer glow blob ─────────────────────────────── */}
      <motion.div
        className="absolute rounded-full pointer-events-none
          dark:bg-[radial-gradient(circle,rgba(232,220,206,0.08)_0%,transparent_65%)]
          bg-[radial-gradient(circle,rgba(10,9,8,0.05)_0%,transparent_65%)]"
        style={{ width: size * 1.6, height: size * 1.6,
          top: "50%", left: "50%",
          transform: "translate(-50%,-50%)" }}
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* ── Concentric pulse rings ───────────────────────── */}
      {[0, 1, 2, 3].map(i => (
        <motion.div
          key={i}
          className="absolute rounded-full border pointer-events-none
            border-black/[0.08] dark:border-[#e8dece]/[0.08]"
          style={{
            width:  size * 0.38 + i * size * 0.2,
            height: size * 0.38 + i * size * 0.2,
            top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
          }}
          animate={{ scale: [1, 1.35, 1], opacity: [0.7, 0, 0.7] }}
          transition={{
            duration: 4 + i * 0.6,
            repeat: Infinity,
            delay: i * 1.1,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* ── Central orb ─────────────────────────────────── */}
      <div
        className="relative flex items-center justify-center rounded-full z-10
          bg-[#0A0908] dark:bg-[#F0EBE0]
          shadow-[0_0_60px_rgba(0,0,0,0.18),0_0_20px_rgba(0,0,0,0.12)]
          dark:shadow-[0_0_60px_rgba(240,235,224,0.22),0_0_24px_rgba(240,235,224,0.12)]"
        style={{ width: size * 0.34, height: size * 0.34 }}
      >
        {/* Breathing scale */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{ scale: [1, 1.07, 1] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Inner waveform bars */}
        <div className="flex items-center gap-[2px] z-10">
          {INNER_BARS.map((h, i) => (
            <motion.div
              key={i}
              className="w-[2.5px] rounded-full bg-[#F0EBE0] dark:bg-[#0A0908] opacity-80"
              animate={{ height: [`${h}px`, `${h * 2.4}px`, `${h}px`] }}
              transition={{
                duration: 0.7 + i * 0.08,
                repeat: Infinity,
                delay: i * 0.055,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Outer waveform bars (horizontal strip below) ─── */}
      <div className="mt-8 flex items-end justify-center gap-[3px]">
        {outerH.map((h, i) => (
          <motion.div
            key={i}
            className="rounded-full bg-black/25 dark:bg-[#e8dece]/25"
            style={{ width: 3 }}
            animate={{ height: `${h * 0.55}px` }}
            transition={{ duration: 0.14, ease: "easeOut" }}
          />
        ))}
      </div>
    </div>
  );
}
