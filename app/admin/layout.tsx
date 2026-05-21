import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "./_components/AdminNav";

export const metadata = { title: "Admin — Silk Resolve" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // If Supabase isn't configured yet, show a setup page instead of crashing
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#f0ebe0] flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <p className="text-2xl font-bold">⚠ Setup Required</p>
          <p className="text-sm opacity-50 font-mono">
            Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your Vercel environment variables, then redeploy.
          </p>
        </div>
      </div>
    );
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check 1: DB flag via user's own session (no service role key needed)
  let isAdminByFlag = false;
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_platform_admin")
      .eq("id", user.id)
      .single();
    isAdminByFlag = profile?.is_platform_admin === true;
  } catch {}

  // Check 2: PLATFORM_ADMIN_EMAILS env var fallback
  const adminEmails = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const isAdminByEmail = !!user.email && adminEmails.includes(user.email);

  if (!isAdminByFlag && !isAdminByEmail) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-[#f0ebe0]">
      <AdminNav userEmail={user.email ?? ""} />
      <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
    </div>
  );
}
