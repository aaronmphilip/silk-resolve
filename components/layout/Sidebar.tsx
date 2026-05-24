"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Bot, Phone, Settings, ExternalLink, LogOut,
  BarChart2, FlaskConical, Server, Brain, FileText, Plug,
  CreditCard, Shield, PhoneCall, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { BrandLogo } from "@/components/brand/BrandLogo";

const PLATFORM_NAV = [
  { href: "/dashboard",  label: "overview",   icon: LayoutDashboard, exact: true },
  { href: "/agents",     label: "agents",     icon: Bot,             exact: false },
  { href: "/scripts",    label: "scripts",    icon: FileText,        exact: false },
  { href: "/calls",      label: "call logs",  icon: Phone,           exact: false },
  { href: "/test-call",  label: "test call",  icon: PhoneCall,       exact: false },
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

function NavLinks({ pathname }: { pathname: string }) {
  return (
    <nav className="flex-1 px-3 pt-4 pb-2 overflow-y-auto">
      <p className="text-[9px] font-mono uppercase tracking-widest px-2 mb-2 font-semibold
        text-black/50 dark:text-[#e8dece]/40">
        platform
      </p>
      <div className="space-y-0.5 mb-5">
        {PLATFORM_NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 text-xs transition-all",
                active
                  ? "bg-black text-[#e8dece] font-semibold dark:bg-[#e8dece] dark:text-[#0a0a0a]"
                  : "text-black/70 hover:text-black hover:bg-black/10 dark:text-[#e8dece]/60 dark:hover:text-[#e8dece] dark:hover:bg-[#e8dece]/10"
              )}>
              <item.icon size={13} strokeWidth={active ? 2.5 : 2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <p className="text-[9px] font-mono uppercase tracking-widest px-2 mb-2 pt-3 font-semibold
        text-black/50 dark:text-[#e8dece]/40
        border-t border-black/15 dark:border-[#e8dece]/10">
        intelligence
      </p>
      <div className="space-y-0.5 mb-5">
        {INTELLIGENCE_NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 text-xs transition-all",
                active
                  ? "bg-black text-[#e8dece] font-semibold dark:bg-[#e8dece] dark:text-[#0a0a0a]"
                  : "text-black/70 hover:text-black hover:bg-black/10 dark:text-[#e8dece]/60 dark:hover:text-[#e8dece] dark:hover:bg-[#e8dece]/10"
              )}>
              <item.icon size={13} strokeWidth={active ? 2.5 : 2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <p className="text-[9px] font-mono uppercase tracking-widest px-2 mb-2 pt-3 font-semibold
        text-black/50 dark:text-[#e8dece]/40
        border-t border-black/15 dark:border-[#e8dece]/10">
        launch
      </p>
      <Link href="/observer"
        className="flex items-center justify-between px-3 py-2.5 text-xs transition-all group
          text-black/70 hover:text-black hover:bg-black/10
          dark:text-[#e8dece]/60 dark:hover:text-[#e8dece] dark:hover:bg-[#e8dece]/10">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60
              bg-black dark:bg-[#e8dece]" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5
              bg-black dark:bg-[#e8dece]" />
          </span>
          <span>live observer</span>
        </div>
        <ExternalLink size={9} className="opacity-0 group-hover:opacity-60 transition-opacity" />
      </Link>

      <p className="text-[9px] font-mono uppercase tracking-widest px-2 mb-2 pt-3 font-semibold
        text-black/50 dark:text-[#e8dece]/40
        border-t border-black/15 dark:border-[#e8dece]/10">
        public
      </p>
      <Link href="/use-cases"
        className="flex items-center gap-2.5 px-3 py-2.5 text-xs transition-all
          text-black/70 hover:text-black hover:bg-black/10
          dark:text-[#e8dece]/60 dark:hover:text-[#e8dece] dark:hover:bg-[#e8dece]/10">
        <ExternalLink size={13} />
        <span>use cases</span>
      </Link>
    </nav>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch("/api/me").then((r) => r.ok ? r.json() : null).then((d) => { if (d) setMe(d); });
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

  const Footer = () => (
    <div className="border-t-2 px-4 py-3
      border-black dark:border-[#e8dece]/20">
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="w-7 h-7 border-2 flex items-center justify-center text-[10px] font-bold font-mono flex-shrink-0
          border-black bg-black text-[#e8dece]
          dark:border-[#e8dece]/40 dark:bg-[#e8dece] dark:text-[#0a0a0a]">
          {initials}
        </div>
        <div className="overflow-hidden flex-1 min-w-0">
          <p className="text-xs font-semibold truncate leading-none mb-0.5">{tenant?.name ?? displayName}</p>
          <p className="text-[10px] font-mono leading-none capitalize
            text-black/50 dark:text-[#e8dece]/40">
            {tenant?.plan ?? "—"} plan
          </p>
        </div>
      </div>
      {tenant && (
        <div className="mb-3">
          <p className="text-[10px] font-mono mb-1
            text-black/50 dark:text-[#e8dece]/40">
            {tenant.callsThisMonth.toLocaleString()} / {(tenant.callLimit / 1000).toFixed(0)}k calls
          </p>
          <div className="h-1 rounded-full overflow-hidden
            bg-black/15 dark:bg-[#e8dece]/15">
            <div className="h-1 rounded-full transition-all
              bg-black dark:bg-[#e8dece]"
              style={{ width: `${usagePct}%` }} />
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <button onClick={handleSignOut}
          className="flex items-center gap-2 text-xs font-mono transition-colors
            text-black/50 hover:text-black
            dark:text-[#e8dece]/40 dark:hover:text-[#e8dece]">
          <LogOut size={11} /> sign out
        </button>
        <ThemeToggle />
      </div>
    </div>
  );

  const Logo = ({ onClose }: { onClose?: () => void }) => (
    <div className="px-5 py-4 border-b-2 flex items-center justify-between flex-shrink-0
      border-black dark:border-[#e8dece]/20">
      <BrandLogo href="/" textClassName="text-sm" />
      {onClose && (
        <button onClick={onClose} className="transition-colors lg:hidden
          text-black/50 hover:text-black
          dark:text-[#e8dece]/50 dark:hover:text-[#e8dece]">
          <X size={16} />
        </button>
      )}
    </div>
  );

  const AdminLink = () => me?.isPlatformAdmin ? (
    <>
      <p className="text-[9px] font-mono uppercase tracking-widest px-5 mb-2 pt-3 font-semibold mx-0
        text-black/50 dark:text-[#e8dece]/40
        border-t border-black/15 dark:border-[#e8dece]/10">
        admin
      </p>
      <div className="px-3 pb-1">
        <Link href="/admin"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 text-xs transition-all",
            pathname.startsWith("/admin")
              ? "bg-black text-[#e8dece] font-semibold dark:bg-[#e8dece] dark:text-[#0a0a0a]"
              : "text-black/70 hover:text-black hover:bg-black/10 dark:text-[#e8dece]/60 dark:hover:text-[#e8dece] dark:hover:bg-[#e8dece]/10"
          )}>
          <Shield size={13} />
          <span>platform admin</span>
        </Link>
      </div>
    </>
  ) : null;

  /* ── Sidebar panel background class ─────────────────────── */
  const panelCls = "bg-[#E3DDCA] dark:bg-[#111110]";

  return (
    <>
      {/* Mobile top bar */}
      <div className={cn(
        "lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 h-14",
        "border-b-2 border-black dark:border-[#e8dece]/20",
        panelCls,
      )}>
        <BrandLogo href="/" textClassName="text-sm" />
        <button
          onClick={() => setMobileOpen(true)}
          className="transition-colors
            text-black hover:text-black/60
            dark:text-[#e8dece] dark:hover:text-[#e8dece]/60"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile spacer */}
      <div className="lg:hidden h-14 flex-shrink-0" />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm dark:bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside className={cn(
        "lg:hidden fixed top-0 left-0 z-50 h-screen w-[240px] flex flex-col transition-transform duration-200 ease-out shadow-2xl",
        panelCls,
        mobileOpen ? "translate-x-0" : "-translate-x-full",
      )}>
        <Logo onClose={() => setMobileOpen(false)} />
        <NavLinks pathname={pathname} />
        <AdminLink />
        <Footer />
      </aside>

      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden lg:flex w-[220px] flex-shrink-0 flex-col h-screen sticky top-0 z-20",
        "border-r-2 border-black dark:border-[#e8dece]/20",
        panelCls,
      )}>
        <Logo />
        <NavLinks pathname={pathname} />
        <AdminLink />
        <Footer />
      </aside>
    </>
  );
}
