"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Users, LayoutDashboard, ArrowLeft, Shield } from "lucide-react";

const NAV = [
  { href: "/admin",         label: "overview",  icon: LayoutDashboard, exact: true },
  { href: "/admin/settings", label: "platform config", icon: Settings,  exact: false },
  { href: "/admin/tenants",  label: "tenants",   icon: Users,           exact: false },
];

export default function AdminNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="w-[210px] flex-shrink-0 border-r border-[#f0ebe0]/10 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-[#f0ebe0]/10 flex items-center gap-2.5">
        <Shield size={14} className="opacity-60" />
        <div>
          <p className="font-bold text-sm tracking-tight">admin</p>
          <p className="text-[9px] font-mono opacity-30">silk resolve platform</p>
        </div>
      </div>

      <nav className="flex-1 px-3 pt-4 pb-2">
        <p className="text-[9px] font-mono opacity-25 uppercase tracking-widest px-2 mb-2">manage</p>
        <div className="space-y-0.5">
          {NAV.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-2.5 px-2.5 py-2 text-xs transition-all ${
                  active ? "bg-[#f0ebe0] text-[#0a0a0a]" : "text-[#f0ebe0]/50 hover:text-[#f0ebe0] hover:bg-[#f0ebe0]/5"
                }`}>
                <item.icon size={11} />
                <span className={active ? "font-medium" : ""}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-[#f0ebe0]/10 px-4 py-3 space-y-2">
        <p className="text-[9px] font-mono opacity-25 truncate">{userEmail}</p>
        <Link href="/dashboard" className="flex items-center gap-2 text-[10px] font-mono opacity-30 hover:opacity-70 transition-opacity">
          <ArrowLeft size={10} /> back to dashboard
        </Link>
      </div>
    </aside>
  );
}
