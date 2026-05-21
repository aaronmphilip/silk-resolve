import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "./_components/AdminNav";

export const metadata = { title: "Admin — Silk Resolve" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check 1: DB flag via user's own session (works without service role key)
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();

  const isAdminByFlag = profile?.is_platform_admin === true;

  // Check 2: env var fallback (works before DB migration is run)
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
