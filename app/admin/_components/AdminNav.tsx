"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, ArrowLeft, Shield, FileCode, Building2 } from "lucide-react";

const NAV = [
  { href: "/admin/tenants",   label: "tenants",   icon: Building2, exact: false },
  { href: "/admin/analytics", label: "analytics", icon: BarChart2, exact: false },
  { href: "/admin/templates", label: "templates", icon: FileCode,  exact: false },
];

export default function AdminNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="w-[210px] flex-shrink-0 border-r border-[#f0ebe0]/10 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#f0ebe0]/10 flex items-center gap-2.5">
        <Shield size={14} className="text-[#f0ebe0]/50" />
        <div>
          <p className="font-bold text-sm tracking-tight text-[#f0ebe0]">admin</p>
          <p className="text-[9px] font-mono text-[#f0ebe0]/25">silk resolve</p>
        </div>
      </div>

      <nav className="flex-1 px-3 pt-5 pb-2">
        <p className="text-[9px] font-mono text-[#f0ebe0]/20 uppercase tracking-widest px-2 mb-3">manage</p>
        <div className="space-y-0.5">
          {NAV.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-2.5 py-2 text-xs transition-all ${
                  active
                    ? "bg-[#f0ebe0] text-[#0a0a0a] font-semibold"
                    : "text-[#f0ebe0]/40 hover:text-[#f0ebe0] hover:bg-[#f0ebe0]/5"
                }`}
              >
                <item.icon size={11} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-[#f0ebe0]/10 px-4 py-4 space-y-2.5">
        <p className="text-[9px] font-mono text-[#f0ebe0]/20 truncate">{userEmail}</p>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-[10px] font-mono text-[#f0ebe0]/30 hover:text-[#f0ebe0]/60 transition-colors"
        >
          <ArrowLeft size={10} /> dashboard
        </Link>
      </div>
    </aside>
  );
}
