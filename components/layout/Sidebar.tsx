"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Bot, Phone, Settings, LogOut,
  BarChart2, Brain, Menu, X, Globe, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { BrandLogo } from "@/components/brand/BrandLogo";

// ── Navigation — kept to what users actually open every day ──────────────────
const NAV = [
  { href: "/dashboard",  label: "overview",   icon: LayoutDashboard, exact: true  },
  { href: "/agents",     label: "agents",     icon: Bot,             exact: false },
  { href: "/calls",      label: "calls",      icon: Phone,           exact: false },
  { href: "/analytics",  label: "analytics",  icon: BarChart2,       exact: false },
  { href: "/mesh",       label: "customers",  icon: Brain,           exact: false },
  { href: "/deploy",     label: "deploy",     icon: Globe,           exact: false },
];

const BOTTOM_NAV = [
  { href: "/settings", label: "settings", icon: Settings, exact: false },
];

interface Me {
  firstName: string;
  lastName: string;
  email: string;
  isPlatformAdmin: boolean;
  tenant: { name: string; plan: string; callsThisMonth: number; callLimit: number } | null;
}

function NavItem({ href, label, icon: Icon, active }: {
  href: string; label: string; icon: React.ElementType; active: boolean;
}) {
  return (
    <Link href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 text-xs font-medium transition-all rounded-none",
        active
          ? "bg-black text-[#e8dece] dark:bg-[#e8dece] dark:text-[#0a0a0a]"
          : "text-black/60 hover:text-black hover:bg-black/8 dark:text-[#e8dece]/50 dark:hover:text-[#e8dece] dark:hover:bg-[#e8dece]/8"
      )}>
      <Icon size={14} strokeWidth={active ? 2.5 : 1.75} />
      <span>{label}</span>
    </Link>
  );
}

function NavLinks({ pathname }: { pathname: string }) {
  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="flex-1 px-2 pt-3 pb-2 overflow-y-auto flex flex-col gap-0.5">

      {/* Main nav */}
      {NAV.map(item => (
        <NavItem key={item.href} href={item.href} label={item.label}
          icon={item.icon} active={isActive(item.href, item.exact)} />
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Live observer — with pulse dot */}
      <Link href="/observer"
        className="flex items-center gap-3 px-3 py-2.5 text-xs font-medium transition-all
          text-black/50 hover:text-black hover:bg-black/8
          dark:text-[#e8dece]/40 dark:hover:text-[#e8dece] dark:hover:bg-[#e8dece]/8">
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50
            bg-emerald-500" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span>live observer</span>
      </Link>

      {/* Divider + bottom nav */}
      <div className="h-px bg-black/10 dark:bg-[#e8dece]/10 my-1" />
      {BOTTOM_NAV.map(item => (
        <NavItem key={item.href} href={item.href} label={item.label}
          icon={item.icon} active={isActive(item.href, item.exact)} />
      ))}
    </nav>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch("/api/me").then(r => r.ok ? r.json() : null).then(d => { if (d) setMe(d); });
  }, []);
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (pathname === "/") return null;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const tenant = me?.tenant;
  const displayName = me ? (`${me.firstName} ${me.lastName}`.trim() || me.email) : "…";
  const initials = me
    ? (`${me.firstName?.[0] ?? ""}${me.lastName?.[0] ?? ""}`.toUpperCase() || me.email?.[0]?.toUpperCase() || "?")
    : "…";
  const usagePct = tenant ? Math.min(100, Math.round((tenant.callsThisMonth / tenant.callLimit) * 100)) : 0;

  const panelCls = "bg-[#E3DDCA] dark:bg-[#111110]";

  const Footer = () => (
    <div className="px-3 pb-3 pt-2 border-t border-black/15 dark:border-[#e8dece]/10">
      {/* Usage bar */}
      {tenant && (
        <div className="px-2 mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[9px] font-mono text-black/40 dark:text-[#e8dece]/30 uppercase tracking-widest">
              {tenant.callsThisMonth.toLocaleString()} / {(tenant.callLimit / 1000).toFixed(0)}k calls
            </p>
            <p className="text-[9px] font-mono text-black/30 dark:text-[#e8dece]/25">{usagePct}%</p>
          </div>
          <div className="h-0.5 bg-black/10 dark:bg-[#e8dece]/10">
            <div className="h-0.5 bg-black dark:bg-[#e8dece] transition-all" style={{ width: `${usagePct}%` }} />
          </div>
        </div>
      )}

      {/* User row */}
      <div className="flex items-center gap-2.5 px-2">
        <div className="w-6 h-6 border flex items-center justify-center text-[9px] font-bold font-mono flex-shrink-0
          border-black bg-black text-[#e8dece]
          dark:border-[#e8dece]/40 dark:bg-[#e8dece] dark:text-[#0a0a0a]">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold truncate leading-tight">{tenant?.name ?? displayName}</p>
          <p className="text-[9px] font-mono text-black/40 dark:text-[#e8dece]/30 capitalize leading-tight">
            {tenant?.plan ?? "free"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button onClick={handleSignOut}
            className="p-1 transition-colors text-black/40 hover:text-black dark:text-[#e8dece]/30 dark:hover:text-[#e8dece]"
            title="Sign out">
            <LogOut size={12} />
          </button>
        </div>
      </div>

      {/* Admin link */}
      {me?.isPlatformAdmin && (
        <div className="mt-2 px-2">
          <Link href="/admin"
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 text-[10px] font-mono transition-all",
              pathname.startsWith("/admin")
                ? "bg-black text-[#e8dece] dark:bg-[#e8dece] dark:text-[#0a0a0a]"
                : "text-black/40 hover:text-black dark:text-[#e8dece]/30 dark:hover:text-[#e8dece]"
            )}>
            <Shield size={10} />
            platform admin
          </Link>
        </div>
      )}
    </div>
  );

  const Logo = ({ onClose }: { onClose?: () => void }) => (
    <div className="px-4 py-4 border-b-2 flex items-center justify-between flex-shrink-0
      border-black dark:border-[#e8dece]/20">
      <BrandLogo href="/" textClassName="text-sm" />
      {onClose && (
        <button onClick={onClose}
          className="transition-colors lg:hidden text-black/50 hover:text-black dark:text-[#e8dece]/50 dark:hover:text-[#e8dece]">
          <X size={16} />
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className={cn(
        "lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 h-14",
        "border-b-2 border-black dark:border-[#e8dece]/20",
        panelCls,
      )}>
        <BrandLogo href="/" textClassName="text-sm" />
        <button onClick={() => setMobileOpen(true)}
          className="text-black hover:text-black/60 dark:text-[#e8dece] dark:hover:text-[#e8dece]/60">
          <Menu size={20} />
        </button>
      </div>
      <div className="lg:hidden h-14 flex-shrink-0" />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile drawer */}
      <aside className={cn(
        "lg:hidden fixed top-0 left-0 z-50 h-screen w-[220px] flex flex-col transition-transform duration-200 ease-out shadow-2xl",
        panelCls,
        mobileOpen ? "translate-x-0" : "-translate-x-full",
      )}>
        <Logo onClose={() => setMobileOpen(false)} />
        <NavLinks pathname={pathname} />
        <Footer />
      </aside>

      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden lg:flex w-[200px] flex-shrink-0 flex-col h-screen sticky top-0 z-20",
        "border-r-2 border-black dark:border-[#e8dece]/20",
        panelCls,
      )}>
        <Logo />
        <NavLinks pathname={pathname} />
        <Footer />
      </aside>
    </>
  );
}
