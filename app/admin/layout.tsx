import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/platform";
import AdminNav from "./_components/AdminNav";

export const metadata = { title: "Admin — Silk Resolve" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ok = await isPlatformAdmin(user.id, user.email);
  if (!ok) redirect("/dashboard");

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-[#f0ebe0]">
      <AdminNav userEmail={user.email ?? ""} />
      <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
    </div>
  );
}
