"use client";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}

export function Reveal({ children, delay = 0, y = 28, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.65,
        delay,
        ease: [0.215, 0.61, 0.355, 1.0], /* cubic-bezier ease-out-cubic */
      }}
    >
      {children}
    </motion.div>
  );
}

/* Stagger children automatically */
interface StaggerProps {
  children: React.ReactNode;
  stagger?: number;
  className?: string;
  delay?: number;
}

export function Stagger({ children, stagger = 0.1, className, delay = 0 }: StaggerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 24 },
        visible: {
          opacity: 1, y: 0,
          transition: { duration: 0.6, ease: [0.215, 0.61, 0.355, 1.0] },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
