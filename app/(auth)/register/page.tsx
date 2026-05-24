"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: [0.215, 0.61, 0.355, 1.0] as const },
});

const INDUSTRIES = [
  "Healthcare", "Aviation & Travel", "Banking & Finance",
  "E-commerce & Retail", "Telecom", "Insurance", "Education", "Government", "Other",
];

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", company: "", industry: "", password: "",
  });
  const [error, setError] = useState("");

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (Object.values(form).some(v => !v)) { setError("all fields are required."); return; }
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: {
          data: { first_name: form.firstName, last_name: form.lastName },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (authError) { setError(authError.message.toLowerCase()); setLoading(false); return; }
      if (!authData.user) { setError("signup failed. please try again."); setLoading(false); return; }
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: authData.user.id, company: form.company,
          industry: form.industry, firstName: form.firstName, lastName: form.lastName,
        }),
      });
      const result = await res.json();
      if (!res.ok) { setError(result.error?.toLowerCase() ?? "failed to create account."); setLoading(false); return; }
      if (!authData.session) { router.push("/onboarding?confirm=1"); return; }
      router.push("/onboarding");
    } catch {
      setError("something went wrong. please try again.");
      setLoading(false);
    }
  }

  const inputCls = `w-full border border-black/10 dark:border-[#e8dece]/10
    bg-transparent px-3 py-2.5 text-sm font-mono
    text-black dark:text-[#e8dece]
    placeholder:text-black/20 dark:placeholder:text-[#e8dece]/20
    focus:outline-none focus:border-black/40 dark:focus:border-[#e8dece]/40
    transition-colors`;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10
      bg-[#ECE7D3] dark:bg-[#09090A] dot-pattern">

      <div className="fixed inset-0 pointer-events-none hidden dark:block"
        style={{ background: "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(232,220,206,0.03) 0%, transparent 70%)" }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <motion.div className="mb-8 text-center" {...fadeUp(0.05)}>
          <Link href="/" className="inline-flex items-center gap-2 mb-5 group">
            <motion.span
              className="text-xl leading-none"
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              âœ³
            </motion.span>
            <span className="font-bold text-base tracking-tight group-hover:opacity-70 transition-opacity">
              silk resolve
            </span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">create your account.</h1>
          <p className="text-xs text-black/35 dark:text-[#e8dece]/35 mt-2 font-mono">
            / enterprise voice infrastructure /
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          className="border border-black/10 dark:border-[#e8dece]/10
            bg-white/60 dark:bg-[#e8dece]/[0.03] backdrop-blur-sm
            shadow-[0_8px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)]"
          {...fadeUp(0.15)}
        >
          <div className="px-6 py-4 border-b border-black/[0.06] dark:border-[#e8dece]/[0.06] flex items-center justify-between">
            <p className="text-[10px] font-mono text-black/35 dark:text-[#e8dece]/35 uppercase tracking-widest">new account</p>
            <p className="text-[10px] font-mono text-black/20 dark:text-[#e8dece]/20">step 1 of 2</p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">

            {/* Name row */}
            <motion.div className="grid grid-cols-2 gap-3" {...fadeUp(0.2)}>
              {[
                { key: "firstName", label: "first name", placeholder: "Aarush" },
                { key: "lastName",  label: "last name",  placeholder: "Mehta"  },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-[10px] font-mono text-black/40 dark:text-[#e8dece]/40 mb-1.5 uppercase tracking-widest">
                    {label}
                  </label>
                  <input
                    value={form[key as keyof typeof form]}
                    onChange={set(key as keyof typeof form)}
                    placeholder={placeholder}
                    className={inputCls}
                  />
                </div>
              ))}
            </motion.div>

            {/* Email + Company */}
            {[
              { key: "email",   label: "work email",   type: "email", placeholder: "you@company.com"   },
              { key: "company", label: "company name", type: "text",  placeholder: "Apollo Healthcare" },
            ].map(({ key, label, type, placeholder }, i) => (
              <motion.div key={key} {...fadeUp(0.25 + i * 0.05)}>
                <label className="block text-[10px] font-mono text-black/40 dark:text-[#e8dece]/40 mb-1.5 uppercase tracking-widest">
                  {label}
                </label>
                <input
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={set(key as keyof typeof form)}
                  placeholder={placeholder}
                  className={inputCls}
                />
              </motion.div>
            ))}

            {/* Industry */}
            <motion.div {...fadeUp(0.35)}>
              <label className="block text-[10px] font-mono text-black/40 dark:text-[#e8dece]/40 mb-1.5 uppercase tracking-widest">
                industry
              </label>
              <select
                value={form.industry} onChange={set("industry")}
                className={`${inputCls} appearance-none cursor-pointer
                  bg-[#ECE7D3] dark:bg-[#09090A]`}
              >
                <option value="">select industry</option>
                {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
              </select>
            </motion.div>

            {/* Password */}
            <motion.div {...fadeUp(0.4)}>
              <label className="block text-[10px] font-mono text-black/40 dark:text-[#e8dece]/40 mb-1.5 uppercase tracking-widest">
                password
              </label>
              <input
                type="password"
                value={form.password} onChange={set("password")}
                placeholder="min 6 characters"
                className={inputCls}
              />
            </motion.div>

            {/* Error */}
            {error && (
              <motion.p
                className="text-xs font-mono px-3 py-2
                  border border-black/10 dark:border-[#e8dece]/10
                  bg-black/[0.03] dark:bg-[#e8dece]/[0.03]
                  text-black/60 dark:text-[#e8dece]/60"
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </motion.p>
            )}

            {/* Submit */}
            <motion.div {...fadeUp(0.45)} className="pt-1">
              <motion.button
                type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2
                  bg-black dark:bg-[#e8dece]
                  text-[#F0EBE0] dark:text-[#09090A]
                  py-3 rounded-full text-sm font-semibold
                  hover:opacity-80 transition-opacity disabled:opacity-40"
                whileTap={{ scale: 0.99 }}
              >
                {loading
                  ? <span className="font-mono text-xs animate-pulse">creating account...</span>
                  : <><span>continue to setup</span><ArrowRight size={13} /></>
                }
              </motion.button>
            </motion.div>
          </form>

          <div className="px-6 pb-5 border-t border-black/[0.06] dark:border-[#e8dece]/[0.06] pt-4">
            <p className="text-xs text-black/35 dark:text-[#e8dece]/35 text-center font-mono">
              already have an account?{" "}
              <Link href="/login"
                className="underline underline-offset-2 hover:text-black dark:hover:text-[#e8dece] transition-colors">
                sign in â†’
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

