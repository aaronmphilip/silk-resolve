"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const NAV_LINKS = [
  { label: "features",   href: "/features"   },
  { label: "use cases",  href: "/use-cases"  },
  { label: "pricing",    href: "/pricing"    },
  { label: "docs",       href: "/docs"       },
];

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 px-6 md:px-10 flex items-center justify-between h-16 transition-all duration-500 ${
        scrolled
          ? "bg-[#ECE7D3]/88 dark:bg-[#09090A]/88 backdrop-blur-xl border-b border-black/[0.06] dark:border-[#e8dece]/[0.06]"
          : "bg-transparent"
      }`}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      {/* Logo — matches Rumik pill-logo style */}
      <Link href="/" className="flex items-center gap-2 group">
        <span className="text-xl leading-none group-hover:opacity-70 transition-opacity">✳</span>
        <span className="font-bold text-[15px] tracking-tight">silk resolve</span>
      </Link>

      {/* Links */}
      <div className="hidden md:flex items-center gap-8">
        {NAV_LINKS.map(({ label, href }, i) => {
          const active = pathname === href;
          return (
            <motion.div key={label}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.18 + i * 0.06 }}
            >
              <Link
                href={href}
                className={`text-[13.5px] transition-colors ${
                  active
                    ? "text-black dark:text-[#e8dece] font-medium"
                    : "text-black/50 dark:text-[#e8dece]/45 hover:text-black dark:hover:text-[#e8dece]"
                }`}
              >
                {label}
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Right — Rumik-style: plain sign in + black pill CTA */}
      <motion.div
        className="flex items-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.45 }}
      >
        <ThemeToggle />
        <Link
          href="/login"
          className="hidden md:block text-[13px] text-black/50 dark:text-[#e8dece]/50
            hover:text-black dark:hover:text-[#e8dece] transition-colors"
        >
          sign in
        </Link>
        {/* Black rounded-full pill — exactly like Rumik's "talk to ira" */}
        <Link
          href="/register"
          className="flex items-center gap-1.5 text-[13px] font-semibold px-5 py-2.5 rounded-full
            bg-[#0A0908] dark:bg-[#e8dece]
            text-[#ECE7D3] dark:text-[#0A0908]
            hover:opacity-80 transition-opacity"
        >
          get started
        </Link>
      </motion.div>
    </motion.nav>
  );
}
