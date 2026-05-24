"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: [0.215, 0.61, 0.355, 1.0] as const },
});

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError("both fields are required."); return; }
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setError(authError.message.toLowerCase()); setLoading(false); return; }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4
      bg-[#F6F1E9] dark:bg-[#09090A] dot-pattern">

      {/* Background glow — dark mode only */}
      <div className="fixed inset-0 pointer-events-none hidden dark:block"
        style={{ background: "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(232,220,206,0.03) 0%, transparent 70%)" }}
      />

      {/* Floating binary watermark */}
      <div className="fixed top-4 right-5 pointer-events-none select-none opacity-[0.04] font-mono text-[10px] leading-relaxed text-right">
        <div>11111111</div><div>111011 1</div><div>000 10</div><div>11111</div><div>0000000</div>
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <motion.div className="mb-10 text-center" {...fadeUp(0.1)}>
          <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
            <motion.span
              className="text-xl leading-none"
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              ✳
            </motion.span>
            <span className="font-bold text-base tracking-tight group-hover:opacity-70 transition-opacity">
              silk resolve
            </span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">welcome back.</h1>
          <p className="text-xs text-black/35 dark:text-[#e8dece]/35 mt-2 font-mono">
            / level 3 autonomous voice infrastructure /
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          className="border border-black/10 dark:border-[#e8dece]/10
            bg-white/60 dark:bg-[#e8dece]/[0.03]
            backdrop-blur-sm
            shadow-[0_8px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)]"
          {...fadeUp(0.2)}
        >
          {/* Card header */}
          <div className="px-6 py-4 border-b border-black/[0.06] dark:border-[#e8dece]/[0.06]">
            <p className="text-[10px] font-mono text-black/35 dark:text-[#e8dece]/35 uppercase tracking-widest">sign in</p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
            {/* Email */}
            <motion.div {...fadeUp(0.3)}>
              <label className="block text-[10px] font-mono text-black/40 dark:text-[#e8dece]/40 mb-1.5 uppercase tracking-widest">
                email
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com" autoComplete="email"
                className="w-full border border-black/10 dark:border-[#e8dece]/10
                  bg-transparent px-3 py-2.5 text-sm font-mono
                  text-black dark:text-[#e8dece]
                  placeholder:text-black/20 dark:placeholder:text-[#e8dece]/20
                  focus:outline-none focus:border-black/40 dark:focus:border-[#e8dece]/40
                  transition-colors"
              />
            </motion.div>

            {/* Password */}
            <motion.div {...fadeUp(0.35)}>
              <label className="block text-[10px] font-mono text-black/40 dark:text-[#e8dece]/40 mb-1.5 uppercase tracking-widest">
                password
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete="current-password"
                  className="w-full border border-black/10 dark:border-[#e8dece]/10
                    bg-transparent px-3 py-2.5 pr-10 text-sm font-mono
                    text-black dark:text-[#e8dece]
                    placeholder:text-black/20 dark:placeholder:text-[#e8dece]/20
                    focus:outline-none focus:border-black/40 dark:focus:border-[#e8dece]/40
                    transition-colors"
                />
                <button
                  type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                    text-black/25 dark:text-[#e8dece]/25
                    hover:text-black/60 dark:hover:text-[#e8dece]/60 transition-colors"
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </motion.div>

            {/* Error */}
            {error && (
              <motion.p
                className="text-xs font-mono px-3 py-2
                  border border-black/10 dark:border-[#e8dece]/10
                  bg-black/[0.03] dark:bg-[#e8dece]/[0.03]
                  text-black/60 dark:text-[#e8dece]/60"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </motion.p>
            )}

            {/* Submit */}
            <motion.div {...fadeUp(0.4)}>
              <motion.button
                type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2
                  bg-black dark:bg-[#e8dece]
                  text-[#F0EBE0] dark:text-[#09090A]
                  py-3 text-sm font-semibold
                  hover:opacity-80 transition-opacity disabled:opacity-40"
                whileTap={{ scale: 0.99 }}
              >
                {loading
                  ? <span className="font-mono text-xs animate-pulse">authenticating...</span>
                  : <><span>sign in</span><ArrowRight size={13} /></>
                }
              </motion.button>
            </motion.div>
          </form>

          <div className="px-6 pb-5 border-t border-black/[0.06] dark:border-[#e8dece]/[0.06] pt-4
            flex items-center justify-between">
            <p className="text-xs text-black/35 dark:text-[#e8dece]/35 font-mono">
              no account?{" "}
              <Link href="/register"
                className="underline underline-offset-2 hover:text-black dark:hover:text-[#e8dece] transition-colors">
                create one →
              </Link>
            </p>
            <button className="text-xs text-black/25 dark:text-[#e8dece]/25 font-mono hover:text-black/50 dark:hover:text-[#e8dece]/50 transition-colors">
              forgot password
            </button>
          </div>
        </motion.div>

        <motion.p
          className="text-center text-[10px] font-mono text-black/18 dark:text-[#e8dece]/18 mt-8"
          {...fadeUp(0.5)}
        >
          silk resolve · enterprise voice infrastructure
        </motion.p>
      </div>
    </div>
  );
}
