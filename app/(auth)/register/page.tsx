"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (Object.values(form).some((v) => !v)) {
      setError("all fields are required.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();

      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { first_name: form.firstName, last_name: form.lastName },
          // Skip email confirmation redirect — we handle auth state directly
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (authError) {
        setError(authError.message.toLowerCase());
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError("signup failed. please try again.");
        setLoading(false);
        return;
      }

      // 2. Create tenant + profile via server-side API (uses service role to bypass RLS)
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: authData.user.id,
          company: form.company,
          industry: form.industry,
          firstName: form.firstName,
          lastName: form.lastName,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error?.toLowerCase() ?? "failed to create account. please try again.");
        setLoading(false);
        return;
      }

      // 3. Success — if email confirmation is required, show message; otherwise proceed
      if (!authData.session) {
        // Email confirmation required — Supabase hasn't issued a session yet
        setError("");
        setLoading(false);
        router.push("/onboarding?confirm=1");
        return;
      }

      router.push("/onboarding");
    } catch {
      setError("something went wrong. please try again.");
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        backgroundColor: "#ede8da",
        backgroundImage: "radial-gradient(rgba(0,0,0,0.07) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }}
    >
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center gap-1.5 mb-4">
            <span className="text-xl leading-none">✳</span>
            <span className="text-lg font-bold tracking-tight">silk resolve</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">create your account</h1>
          <p className="text-xs opacity-40 mt-1.5 font-mono">/ enterprise voice infrastructure /</p>
        </div>

        <div className="border border-black/20 shadow-[3px_3px_0px_rgba(0,0,0,0.12)] bg-[#ede8da]">
          <div className="px-6 py-4 border-b border-black/10 flex items-center justify-between">
            <p className="text-xs font-mono opacity-40 uppercase tracking-widest">new account</p>
            <p className="text-[10px] font-mono opacity-25">step 1 of 2</p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "firstName", label: "first name", placeholder: "Aarush" },
                { key: "lastName",  label: "last name",  placeholder: "Mehta" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-[10px] font-mono opacity-50 mb-1.5 uppercase tracking-widest">{label}</label>
                  <input
                    value={form[key as keyof typeof form]}
                    onChange={set(key as keyof typeof form)}
                    placeholder={placeholder}
                    className="w-full border border-black/20 bg-transparent px-3 py-2.5 text-sm font-mono placeholder:opacity-25 focus:outline-none focus:border-black/60 transition-colors"
                  />
                </div>
              ))}
            </div>

            {/* Email + Company */}
            {[
              { key: "email",   label: "work email",    type: "email", placeholder: "you@company.com" },
              { key: "company", label: "company name",  type: "text",  placeholder: "Apollo Healthcare" },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="block text-[10px] font-mono opacity-50 mb-1.5 uppercase tracking-widest">{label}</label>
                <input
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={set(key as keyof typeof form)}
                  placeholder={placeholder}
                  className="w-full border border-black/20 bg-transparent px-3 py-2.5 text-sm font-mono placeholder:opacity-25 focus:outline-none focus:border-black/60 transition-colors"
                />
              </div>
            ))}

            {/* Industry */}
            <div>
              <label className="block text-[10px] font-mono opacity-50 mb-1.5 uppercase tracking-widest">industry</label>
              <select
                value={form.industry}
                onChange={set("industry")}
                className="w-full border border-black/20 bg-[#ede8da] px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-black/60 appearance-none transition-colors"
              >
                <option value="">select industry</option>
                {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
              </select>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-mono opacity-50 mb-1.5 uppercase tracking-widest">password</label>
              <input
                type="password"
                value={form.password}
                onChange={set("password")}
                placeholder="min 6 characters"
                className="w-full border border-black/20 bg-transparent px-3 py-2.5 text-sm font-mono placeholder:opacity-25 focus:outline-none focus:border-black/60 transition-colors"
              />
            </div>

            {error && (
              <p className="text-xs font-mono border border-black/20 px-3 py-2 bg-black/5">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-black text-[#ede8da] py-3 rounded-full text-sm font-medium hover:bg-black/80 transition-colors disabled:opacity-50 mt-2"
            >
              {loading
                ? <span className="font-mono text-xs animate-pulse">creating account...</span>
                : <><span>continue to setup</span><ArrowRight size={13} /></>
              }
            </button>
          </form>

          <div className="px-6 pb-5 border-t border-black/10 pt-4">
            <p className="text-xs opacity-40 text-center font-mono">
              already have an account?{" "}
              <Link href="/login" className="underline hover:opacity-70">sign in →</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
