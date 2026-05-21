"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Bot, Phone, Settings, ExternalLink, LogOut,
  BarChart2, FlaskConical, Server, Brain, FileText, Plug,
  CreditCard, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const PLATFORM_NAV = [
  { href: "/dashboard",  label: "overview",   icon: LayoutDashboard, exact: true },
  { href: "/agents",     label: "agents",     icon: Bot,             exact: false },
  { href: "/scripts",    label: "scripts",    icon: FileText,        exact: false },
  { href: "/calls",      label: "call logs",  icon: Phone,           exact: false },
  { href: "/analytics",  label: "analytics",  icon: BarChart2,       exact: false },
];

const INTELLIGENCE_NAV = [
  { href: "/mesh",           label: "mesh · souls",   icon: Brain,        exact: false },
  { href: "/integrations",   label: "integrations",   icon: Plug,         exact: false },
  { href: "/ab-testing",     label: "a/b testing",    icon: FlaskConical, exact: false },
  { href: "/infrastructure", label: "infrastructure", icon: Server,       exact: false },
  { href: "/billing",        label: "billing",        icon: CreditCard,   exact: false },
  { href: "/settings",       label: "settings",       icon: Settings,     exact: false },
];

interface Me {
  firstName: string;
  lastName: string;
  email: string;
  isPlatformAdmin: boolean;
  tenant: { name: string; plan: string; callsThisMonth: number; callLimit: number } | null;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetch("/api/me").then((r) => r.ok ? r.json() : null).then((d) => { if (d) setMe(d); });
  }, []);

  if (pathname === "/") return null;

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const tenant = me?.tenant;
  const displayName = me ? (`${me.firstName} ${me.lastName}`.trim() || me.email) : "…";
  const initials = me
    ? (`${me.firstName[0] ?? ""}${me.lastName[0] ?? ""}`.toUpperCase() || me.email?.[0]?.toUpperCase() || "?")
    : "…";
  const usagePct = tenant ? Math.round((tenant.callsThisMonth / tenant.callLimit) * 100) : 0;

  return (
    <aside className="w-[210px] flex-shrink-0 border-r border-black flex flex-col h-screen sticky top-0 bg-[#e8dece] z-20">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-black flex items-center gap-2">
        <span className="text-base leading-none">✳</span>
        <span className="font-bold text-sm tracking-tight">silk resolve</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-4 pb-2 overflow-y-auto">
        <p className="text-[9px] font-mono opacity-25 uppercase tracking-widest px-2 mb-2">platform</p>
        <div className="space-y-0.5 mb-4">
          {PLATFORM_NAV.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link key={item.href} href={item.href}
                className={cn("flex items-center gap-2.5 px-2.5 py-2 text-xs transition-all",
                  active ? "bg-black text-[#e8dece]" : "text-black/60 hover:text-black hover:bg-black/5")}>
                <item.icon size={11} strokeWidth={active ? 2.5 : 2} />
                <span className={active ? "font-medium" : ""}>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <p className="text-[9px] font-mono opacity-25 uppercase tracking-widest px-2 mb-2 pt-3 border-t border-black/10">intelligence</p>
        <div className="space-y-0.5 mb-4">
          {INTELLIGENCE_NAV.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link key={item.href} href={item.href}
                className={cn("flex items-center gap-2.5 px-2.5 py-2 text-xs transition-all",
                  active ? "bg-black text-[#e8dece]" : "text-black/60 hover:text-black hover:bg-black/5")}>
                <item.icon size={11} strokeWidth={active ? 2.5 : 2} />
                <span className={active ? "font-medium" : ""}>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <p className="text-[9px] font-mono opacity-25 uppercase tracking-widest px-2 mb-2 pt-3 border-t border-black/10">launch</p>
        <Link href="/observer"
          className="flex items-center justify-between px-2.5 py-2 text-xs text-black/50 hover:text-black hover:bg-black/5 transition-all group">
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-50" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-black" />
            </span>
            <span>live observer</span>
          </div>
          <ExternalLink size={9} className="opacity-0 group-hover:opacity-60 transition-opacity" />
        </Link>

        {/* Admin link — only shown for platform admins */}
        {me?.isPlatformAdmin && (
          <>
            <p className="text-[9px] font-mono opacity-25 uppercase tracking-widest px-2 mb-2 pt-3 border-t border-black/10">admin</p>
            <Link href="/admin"
              className={cn("flex items-center gap-2.5 px-2.5 py-2 text-xs transition-all",
                pathname.startsWith("/admin") ? "bg-black text-[#e8dece]" : "text-black/60 hover:text-black hover:bg-black/5")}>
              <Shield size={11} />
              <span className={pathname.startsWith("/admin") ? "font-medium" : ""}>platform admin</span>
            </Link>
          </>
        )}
      </nav>

      {/* Tenant footer */}
      <div className="border-t border-black px-4 py-3">
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-6 h-6 border border-black flex items-center justify-center text-[9px] font-bold font-mono flex-shrink-0 bg-black text-[#e8dece]">
            {initials}
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-xs font-medium truncate leading-none mb-0.5">{tenant?.name ?? displayName}</p>
            <p className="text-[9px] font-mono opacity-35 leading-none capitalize">{tenant?.plan ?? "—"} plan</p>
          </div>
        </div>
        {tenant && (
          <div className="mb-2.5">
            <p className="text-[9px] font-mono opacity-25 mb-1">
              {tenant.callsThisMonth.toLocaleString()} / {(tenant.callLimit / 1000).toFixed(0)}k calls
            </p>
            <div className="h-0.5 bg-black/10">
              <div className="h-0.5 bg-black transition-all" style={{ width: `${usagePct}%` }} />
            </div>
          </div>
        )}
        <button onClick={handleSignOut}
          className="flex items-center gap-2 text-[10px] font-mono opacity-25 hover:opacity-60 transition-opacity">
          <LogOut size={10} /> sign out
        </button>
      </div>
    </aside>
  );
}
