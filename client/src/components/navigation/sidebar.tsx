"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
};

const telemetryItems: NavItem[] = [
  { label: "Services", href: "/services" },
  { label: "Live Tail", href: "/logs" },
  { label: "Metrics", href: "/dashboard" },
];

const configurationItems: NavItem[] = [{ label: "General", href: "/configurations" }];

function NavLink({ item, activePath }: { item: NavItem; activePath: string }) {
  const isActive = activePath === item.href;

  return (
    <Link
      href={item.href}
      className={`block rounded-md px-3 py-2 text-sm transition ${
        isActive
          ? "bg-zinc-800 text-white"
          : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
      }`}
    >
      {item.label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const activePath =
    pathname === "/"
      ? "/dashboard"
      : pathname.startsWith("/dashboard")
        ? "/dashboard"
        : pathname.startsWith("/logs")
          ? "/logs"
          : pathname.startsWith("/services")
            ? "/services"
            : pathname.startsWith("/configurations")
              ? "/configurations"
              : pathname;

  return (
    <aside className="h-full border-b border-zinc-800 bg-zinc-950 px-3 py-4 lg:border-r lg:border-b-0">
      <div className="mb-6 px-2 text-sm font-semibold tracking-wide text-zinc-100">
        LOGTAIL OPS
      </div>

      <nav className="space-y-6">
        <section>
          <div className="mb-2 px-2 text-xs uppercase tracking-wide text-zinc-500">
            Telemetry
          </div>
          <div className="space-y-1">
            {telemetryItems.map((item) => (
              <NavLink key={item.href} item={item} activePath={activePath} />
            ))}
          </div>
        </section>

        <section>
          <div className="mb-2 px-2 text-xs uppercase tracking-wide text-zinc-500">
            Configurations
          </div>
          <div className="space-y-1">
            {configurationItems.map((item) => (
              <NavLink key={item.href} item={item} activePath={activePath} />
            ))}
          </div>
        </section>
      </nav>
    </aside>
  );
}
