import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "./_components/AdminNav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — Silk Resolve" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Guard: env vars not configured yet
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
      <div className="admin-shell min-h-screen bg-[var(--bg)] text-[var(--fg)] dark:bg-[#0a0a0a] dark:text-[#f0ebe0] flex items-center justify-center p-8">
        <div className="max-w-lg space-y-4 text-center">
          <p className="text-3xl font-bold">⚠</p>
          <p className="text-lg font-bold">Supabase not configured</p>
          <p className="text-sm opacity-50 font-mono leading-relaxed">
            Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your
            Vercel environment variables, then redeploy.
          </p>
        </div>
      </div>
    );
  }

  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  // Check DB flag (uses user's own session — no service role key needed)
  let isAdminByFlag = false;
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_platform_admin")
      .eq("id", user.id)
      .single();
    isAdminByFlag = profile?.is_platform_admin === true;
  } catch {}

  // Fallback: PLATFORM_ADMIN_EMAILS env var
  const adminEmails = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const isAdminByEmail = !!user.email && adminEmails.includes(user.email);

  if (!isAdminByFlag && !isAdminByEmail) {
    redirect("/dashboard");
  }

  return (
    <div className="admin-shell flex min-h-screen flex-col lg:flex-row bg-[var(--bg)] text-[var(--fg)] dark:bg-[#0a0a0a] dark:text-[#f0ebe0]">
      <AdminNav userEmail={user.email ?? ""} />
      <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
    </div>
  );
}
