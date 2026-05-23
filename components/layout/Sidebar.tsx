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
      <p className="text-[9px] font-mono text-black/50 uppercase tracking-widest px-2 mb-2 font-semibold">platform</p>
      <div className="space-y-0.5 mb-5">
        {PLATFORM_NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 text-xs transition-all",
                active ? "bg-black text-[#e8dece] font-semibold" : "text-black/70 hover:text-black hover:bg-black/10"
              )}>
              <item.icon size={13} strokeWidth={active ? 2.5 : 2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <p className="text-[9px] font-mono text-black/50 uppercase tracking-widest px-2 mb-2 pt-3 border-t border-black/15 font-semibold">intelligence</p>
      <div className="space-y-0.5 mb-5">
        {INTELLIGENCE_NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 text-xs transition-all",
                active ? "bg-black text-[#e8dece] font-semibold" : "text-black/70 hover:text-black hover:bg-black/10"
              )}>
              <item.icon size={13} strokeWidth={active ? 2.5 : 2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <p className="text-[9px] font-mono text-black/50 uppercase tracking-widest px-2 mb-2 pt-3 border-t border-black/15 font-semibold">launch</p>
      <Link href="/observer"
        className="flex items-center justify-between px-3 py-2.5 text-xs text-black/70 hover:text-black hover:bg-black/10 transition-all group">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-60" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-black" />
          </span>
          <span>live observer</span>
        </div>
        <ExternalLink size={9} className="opacity-0 group-hover:opacity-60 transition-opacity" />
      </Link>

      <p className="text-[9px] font-mono text-black/50 uppercase tracking-widest px-2 mb-2 pt-3 border-t border-black/15 font-semibold">docs</p>
      <Link href="/research"
        className="flex items-center gap-2.5 px-3 py-2.5 text-xs text-black/70 hover:text-black hover:bg-black/10 transition-all">
        <ExternalLink size={13} />
        <span>research</span>
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

  // Close mobile menu on route change
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
    <div className="border-t-2 border-black px-4 py-3">
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="w-7 h-7 border-2 border-black flex items-center justify-center text-[10px] font-bold font-mono flex-shrink-0 bg-black text-[#e8dece]">
          {initials}
        </div>
        <div className="overflow-hidden flex-1 min-w-0">
          <p className="text-xs font-semibold truncate leading-none mb-0.5">{tenant?.name ?? displayName}</p>
          <p className="text-[10px] font-mono text-black/50 leading-none capitalize">{tenant?.plan ?? "—"} plan</p>
        </div>
      </div>
      {tenant && (
        <div className="mb-3">
          <p className="text-[10px] font-mono text-black/50 mb-1">
            {tenant.callsThisMonth.toLocaleString()} / {(tenant.callLimit / 1000).toFixed(0)}k calls
          </p>
          <div className="h-1 bg-black/15 rounded-full overflow-hidden">
            <div className="h-1 bg-black rounded-full transition-all" style={{ width: `${usagePct}%` }} />
          </div>
        </div>
      )}
      <button onClick={handleSignOut}
        className="flex items-center gap-2 text-xs font-mono text-black/50 hover:text-black transition-colors">
        <LogOut size={11} /> sign out
      </button>
    </div>
  );

  const Logo = ({ onClose }: { onClose?: () => void }) => (
    <div className="px-5 py-4 border-b-2 border-black flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-base leading-none">✳</span>
        <span className="font-bold text-sm tracking-tight">silk resolve</span>
      </div>
      {onClose && (
        <button onClick={onClose} className="text-black/50 hover:text-black transition-colors lg:hidden">
          <X size={16} />
        </button>
      )}
    </div>
  );

  const AdminLink = () => me?.isPlatformAdmin ? (
    <>
      <p className="text-[9px] font-mono text-black/50 uppercase tracking-widest px-5 mb-2 pt-3 border-t border-black/15 font-semibold mx-0">admin</p>
      <div className="px-3 pb-1">
        <Link href="/admin"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 text-xs transition-all",
            pathname.startsWith("/admin") ? "bg-black text-[#e8dece] font-semibold" : "text-black/70 hover:text-black hover:bg-black/10"
          )}>
          <Shield size={13} />
          <span>platform admin</span>
        </Link>
      </div>
    </>
  ) : null;

  return (
    <>
      {/* Mobile top bar — shown on small screens */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[#e8dece] border-b-2 border-black flex items-center justify-between px-4 py-3 h-14">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">✳</span>
          <span className="font-bold text-sm tracking-tight">silk resolve</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="text-black hover:text-black/60 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile: spacer so content doesn't hide under top bar */}
      <div className="lg:hidden h-14 flex-shrink-0" />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside className={cn(
        "lg:hidden fixed top-0 left-0 z-50 h-screen w-[240px] bg-[#e8dece] flex flex-col transition-transform duration-200 ease-out shadow-2xl",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Logo onClose={() => setMobileOpen(false)} />
        <NavLinks pathname={pathname} />
        <AdminLink />
        <Footer />
      </aside>

      {/* Desktop sidebar — hidden on mobile */}
      <aside className="hidden lg:flex w-[220px] flex-shrink-0 border-r-2 border-black flex-col h-screen sticky top-0 bg-[#e8dece] z-20">
        <Logo />
        <NavLinks pathname={pathname} />
        <AdminLink />
        <Footer />
      </aside>
    </>
  );
}
