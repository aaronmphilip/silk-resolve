"use client";
import { motion } from "framer-motion";

const INNER_BARS = [3, 5, 8, 12, 16, 12, 8, 5, 3, 5, 8, 12, 8, 5, 3];

/* Pre-computed outer bar configs — static, no JS interval, no re-renders */
const OUTER = Array.from({ length: 32 }, (_, i) => {
  const t = i / 32;
  const base = 14 + Math.sin(t * Math.PI * 4) * 22 + Math.cos(t * Math.PI * 2) * 10;
  return {
    minH: Math.max(5, base * 0.28),
    maxH: Math.max(10, base * 0.95),
    dur:   0.85 + (i % 7) * 0.14,   // 0.85 – 1.69 s
    delay: -(i * 0.072),             // stagger via negative delay
  };
});

export function VoiceOrb({ size = 300 }: { size?: number }) {
  return (
    <div className="relative flex flex-col items-center select-none">

      {/* ── Ambient glow ────────────────────────────────────── */}
      <motion.div
        className="absolute rounded-full pointer-events-none
          bg-[radial-gradient(circle,rgba(10,9,8,0.04)_0%,transparent_65%)]
          dark:bg-[radial-gradient(circle,rgba(232,220,206,0.07)_0%,transparent_65%)]"
        style={{
          width: size * 1.7, height: size * 1.7,
          top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* ── Concentric pulse rings ───────────────────────────── */}
      {[0, 1, 2, 3].map(i => (
        <motion.div key={i}
          className="absolute rounded-full border pointer-events-none
            border-black/[0.07] dark:border-[#e8dece]/[0.07]"
          style={{
            width:  size * 0.36 + i * size * 0.19,
            height: size * 0.36 + i * size * 0.19,
            top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
          transition={{
            duration: 4.5 + i * 0.55,
            repeat: Infinity,
            delay: i * 1.2,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* ── Central orb ─────────────────────────────────────── */}
      <div
        className="relative flex items-center justify-center rounded-full z-10
          bg-[#0A0908] dark:bg-[#ECE7D3]
          shadow-[0_0_60px_rgba(0,0,0,0.18),0_0_22px_rgba(0,0,0,0.12)]
          dark:shadow-[0_0_60px_rgba(236,231,211,0.18),0_0_22px_rgba(236,231,211,0.10)]"
        style={{ width: size * 0.34, height: size * 0.34 }}
      >
        {/* Breathing scale overlay */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Inner waveform bars — contained inside fixed-size orb, safe to animate */}
        <div className="flex items-center gap-[2.5px] z-10">
          {INNER_BARS.map((h, i) => (
            <motion.div key={i}
              className="rounded-full bg-[#ECE7D3] dark:bg-[#0A0908] opacity-85"
              style={{ width: 2.5 }}
              animate={{ height: [`${h}px`, `${h * 2.2}px`, `${h}px`] }}
              transition={{
                duration: 0.8 + i * 0.07,
                repeat: Infinity,
                delay: i * 0.055,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Outer waveform bars — fully static, no animation ─── */}
      <div className="mt-8 flex items-end justify-center gap-[3.5px]"
           style={{ height: 52 }}>
        {OUTER.map((cfg, i) => (
          <div
            key={i}
            className="voice-outer-bar rounded-full bg-black/25 dark:bg-[#e8dece]/25"
            style={{ width: 3, height: cfg.maxH }}
          />
        ))}
      </div>
    </div>
  );
}
