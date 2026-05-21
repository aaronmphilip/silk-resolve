"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const INDUSTRIES = ["Healthcare", "Aviation & Travel", "Banking & Finance", "E-commerce & Retail", "Telecom", "Insurance", "Education", "Government", "Other"];

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", company: "", industry: "", password: "" });
  const [error, setError] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (Object.values(form).some((v) => !v)) { setError("all fields are required."); return; }
    setError("");
    setLoading(true);

    const supabase = createClient();

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { first_name: form.firstName, last_name: form.lastName } },
    });

    if (authError || !authData.user) {
      setError(authError?.message.toLowerCase() ?? "signup failed. try again.");
      setLoading(false);
      return;
    }

    // 2. Create tenant
    const slug = form.company.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({ name: form.company, slug: `${slug}-${Date.now()}`, plan: "starter", industry: form.industry })
      .select()
      .single();

    if (tenantError || !tenant) {
      setError("failed to create account. please try again.");
      setLoading(false);
      return;
    }

    // 3. Create profile
    await supabase.from("profiles").insert({
      id: authData.user.id,
      tenant_id: tenant.id,
      first_name: form.firstName,
      last_name: form.lastName,
      role: "owner",
    });

    setLoading(false);
    router.push("/onboarding");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#f0ebe0", backgroundImage: "radial-gradient(rgba(0,0,0,0.1) 1px, transparent 1px)", backgroundSize: "22px 22px" }}>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 border border-black rounded-full mb-4">
            <span className="text-xs font-bold font-mono">SR</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">create your account</h1>
          <p className="text-xs opacity-40 mt-1.5 font-mono">/ silk resolver · enterprise voice infrastructure /</p>
        </div>

        <div className="border border-black shadow-[3px_3px_0px_rgba(0,0,0,0.85)]">
          <div className="px-6 py-4 border-b border-black flex items-center justify-between">
            <p className="text-xs font-mono opacity-40 uppercase tracking-widest">new account</p>
            <p className="text-[10px] font-mono opacity-25">step 1 of 2</p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[{ key: "firstName", label: "first name", placeholder: "Aarush" }, { key: "lastName", label: "last name", placeholder: "Mehta" }].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-[10px] font-mono opacity-50 mb-1.5 uppercase tracking-widest">{label}</label>
                  <input value={form[key as keyof typeof form]} onChange={set(key as keyof typeof form)} placeholder={placeholder}
                    className="w-full border border-black bg-transparent px-3 py-2.5 text-sm font-mono placeholder:opacity-25 focus:outline-none focus:shadow-[1px_1px_0px_rgba(0,0,0,0.85)]" />
                </div>
              ))}
            </div>

            {[{ key: "email", label: "work email", type: "email", placeholder: "you@company.com" }, { key: "company", label: "company name", type: "text", placeholder: "Apollo Healthcare" }].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="block text-[10px] font-mono opacity-50 mb-1.5 uppercase tracking-widest">{label}</label>
                <input type={type} value={form[key as keyof typeof form]} onChange={set(key as keyof typeof form)} placeholder={placeholder}
                  className="w-full border border-black bg-transparent px-3 py-2.5 text-sm font-mono placeholder:opacity-25 focus:outline-none focus:shadow-[1px_1px_0px_rgba(0,0,0,0.85)]" />
              </div>
            ))}

            <div>
              <label className="block text-[10px] font-mono opacity-50 mb-1.5 uppercase tracking-widest">industry</label>
              <select value={form.industry} onChange={set("industry")}
                className="w-full border border-black bg-[#f0ebe0] px-3 py-2.5 text-sm font-mono focus:outline-none appearance-none">
                <option value="">select industry</option>
                {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono opacity-50 mb-1.5 uppercase tracking-widest">password</label>
              <input type="password" value={form.password} onChange={set("password")} placeholder="min 6 characters"
                className="w-full border border-black bg-transparent px-3 py-2.5 text-sm font-mono placeholder:opacity-25 focus:outline-none focus:shadow-[1px_1px_0px_rgba(0,0,0,0.85)]" />
            </div>

            {error && <p className="text-xs font-mono border border-black/30 px-3 py-2 bg-black/5">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-black text-[#f0ebe0] py-3 text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50 mt-2">
              {loading ? <span className="font-mono text-xs animate-pulse">creating account...</span> : <><span>continue to setup</span><ArrowRight size={13} /></>}
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
