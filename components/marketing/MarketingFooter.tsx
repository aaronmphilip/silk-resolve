import Link from "next/link";

const LINKS = {
  product: [
    { label: "features",      href: "/features"   },
    { label: "use cases",     href: "/use-cases"  },
    { label: "pricing",       href: "/pricing"    },
    { label: "docs",          href: "/docs"       },
  ],
  company: [
    { label: "about",         href: "#" },
    { label: "research",      href: "/research" },
    { label: "live observer", href: "/observer" },
  ],
  platform: [
    { label: "sign in",       href: "/login"    },
    { label: "get started",   href: "/register" },
    { label: "dashboard",     href: "/dashboard"},
  ],
};

export function MarketingFooter() {
  return (
    <footer className="border-t border-black/[0.08] dark:border-[#e8dece]/[0.08] mt-24">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-14 grid grid-cols-2 md:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg leading-none">✳</span>
            <span className="font-bold text-sm tracking-tight">silk resolve</span>
          </div>
          <p className="text-xs text-black/38 dark:text-[#e8dece]/38 font-mono leading-relaxed max-w-[200px]">
            enterprise voice intelligence.<br />every call, forever felt.
          </p>
        </div>

        {/* Link columns */}
        {Object.entries(LINKS).map(([title, items]) => (
          <div key={title}>
            <p className="text-[9px] font-mono uppercase tracking-widest text-black/35 dark:text-[#e8dece]/35 mb-3">
              {title}
            </p>
            <ul className="space-y-2.5">
              {items.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-xs text-black/55 dark:text-[#e8dece]/55
                      hover:text-black dark:hover:text-[#e8dece] transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-6 md:px-10 pb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-[10px] font-mono text-black/25 dark:text-[#e8dece]/25">
          © {new Date().getFullYear()} silk resolve. all rights reserved.
        </p>
        <p className="text-[10px] font-mono text-black/25 dark:text-[#e8dece]/25">
          SOC 2 · HIPAA · ISO 27001
        </p>
      </div>
    </footer>
  );
}
