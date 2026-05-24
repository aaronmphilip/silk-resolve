"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart2, ArrowLeft, FileCode, Building2, Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";

const NAV = [
  { href: "/admin/tenants",   label: "tenants",   icon: Building2, exact: false },
  { href: "/admin/analytics", label: "analytics", icon: BarChart2, exact: false },
  { href: "/admin/templates", label: "templates", icon: FileCode,  exact: false },
];

export default function AdminNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  }

  const NavPanel = ({ mobile = false }: { mobile?: boolean }) => (
    <aside className={`admin-nav-panel w-[240px] lg:w-[210px] flex-shrink-0 border-r border-[#f0ebe0]/10 backdrop-blur-sm flex flex-col h-screen ${mobile ? "" : "hidden lg:flex sticky top-0"}`}>
      <div className="px-5 py-5 border-b border-[#f0ebe0]/10 space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <BrandLogo href="/dashboard" className="text-[#f0ebe0]" textClassName="text-sm" />
          {mobile && (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="text-[#f0ebe0]/40 hover:text-[#f0ebe0] transition-colors"
              aria-label="Close admin menu"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <p className="text-[9px] font-mono text-[#f0ebe0]/25 uppercase tracking-widest">
          admin console
        </p>
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
              onClick={() => setMobileOpen(false)}
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

  return (
    <>
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 px-4 border-b border-[#f0ebe0]/10 bg-[#0a0a0a] flex items-center justify-between">
        <BrandLogo href="/dashboard" className="text-[#f0ebe0]" textClassName="text-sm" />
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="text-[#f0ebe0] hover:text-[#f0ebe0]/70 transition-colors"
          aria-label="Open admin menu"
        >
          <Menu size={20} />
        </button>
      </div>
      <div className="lg:hidden h-14 flex-shrink-0" />

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className={`lg:hidden fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-out ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <NavPanel mobile />
      </div>

      <NavPanel />
    </>
  );
}
