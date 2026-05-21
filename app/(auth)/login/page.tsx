"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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

    if (authError) {
      setError(authError.message.toLowerCase());
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#e8dece", backgroundImage: "radial-gradient(rgba(0,0,0,0.12) 1px, transparent 1px)", backgroundSize: "22px 22px" }}>
      <div className="fixed top-3 right-4 pointer-events-none select-none opacity-[0.12] font-mono text-[10px] leading-relaxed text-right">
        <div>11111111</div><div>1110011</div><div>000 10</div><div>11111</div><div>0000000</div>
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 border border-black rounded-full mb-4">
            <span className="text-xs font-bold font-mono">SR</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">silk resolver</h1>
          <p className="text-xs opacity-40 mt-1.5 font-mono">/ level 3 autonomous voice infrastructure /</p>
        </div>

        <div className="border border-black shadow-[3px_3px_0px_rgba(0,0,0,0.85)]">
          <div className="px-6 py-4 border-b border-black">
            <p className="text-xs font-mono opacity-40 uppercase tracking-widest">sign in</p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
            <div>
              <label className="block text-xs font-mono opacity-50 mb-1.5 uppercase tracking-widest">email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email"
                className="w-full border border-black bg-transparent px-3 py-2.5 text-sm font-mono placeholder:opacity-25 focus:outline-none focus:shadow-[1px_1px_0px_rgba(0,0,0,0.85)] transition-shadow" />
            </div>

            <div>
              <label className="block text-xs font-mono opacity-50 mb-1.5 uppercase tracking-widest">password</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password"
                  className="w-full border border-black bg-transparent px-3 py-2.5 text-sm font-mono placeholder:opacity-25 focus:outline-none focus:shadow-[1px_1px_0px_rgba(0,0,0,0.85)] transition-shadow pr-10" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30 hover:opacity-70 transition-opacity">
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && <p className="text-xs font-mono border border-black/30 px-3 py-2 bg-black/5">{error}</p>}

            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-black text-[#f0ebe0] py-3 text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50">
              {loading ? <span className="font-mono text-xs animate-pulse">authenticating...</span> : <><span>sign in</span><ArrowRight size={13} /></>}
            </button>
          </form>

          <div className="px-6 pb-5 border-t border-black/10 pt-4 flex items-center justify-between">
            <p className="text-xs opacity-40 font-mono">
              no account?{" "}
              <Link href="/register" className="underline hover:opacity-70">create one →</Link>
            </p>
            <p className="text-xs opacity-30 font-mono cursor-pointer hover:opacity-60">forgot password</p>
          </div>
        </div>
        <p className="text-center text-[10px] font-mono opacity-20 mt-8">silk resolver · enterprise voice infrastructure</p>
      </div>
    </div>
  );
}
