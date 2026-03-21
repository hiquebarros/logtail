"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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

type MePayload = {
  user: {
    id: string;
    email: string;
    name: string | null;
    createdAt: string;
  };
  activeOrganization: {
    id: string;
    name: string;
    role: string;
    status: string;
  };
  memberships: Array<{
    organization: {
      id: string;
      name: string;
    };
    role: string;
    status: string;
  }>;
};

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
  const router = useRouter();
  const [account, setAccount] = useState<MePayload | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);
  const [isSwitchingOrg, setIsSwitchingOrg] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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
  const initials = useMemo(() => {
    const value = account?.user.name || account?.user.email || "U";
    return value.slice(0, 1).toUpperCase();
  }, [account?.user.email, account?.user.name]);

  useEffect(() => {
    const run = async () => {
      setIsLoadingAccount(true);
      setAccountError(null);
      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include"
      });

      if (!response.ok) {
        setAccount(null);
        setAccountError("Not signed in");
        setIsLoadingAccount(false);
        return;
      }

      const payload = (await response.json()) as MePayload;
      setAccount(payload);
      setIsLoadingAccount(false);
    };

    void run();
  }, []);

  const onSwitchOrganization = async (organizationId: string) => {
    if (!account || organizationId === account.activeOrganization.id) {
      return;
    }

    setIsSwitchingOrg(true);
    const response = await fetch("/api/auth/switch-organization", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ organizationId })
    });
    setIsSwitchingOrg(false);

    if (!response.ok) {
      return;
    }

    const refreshed = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include"
    });
    if (!refreshed.ok) {
      return;
    }

    const payload = (await refreshed.json()) as MePayload;
    setAccount(payload);
    router.refresh();
    window.location.reload();
  };

  const onLogout = async () => {
    setIsLoggingOut(true);
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include"
    });
    setIsLoggingOut(false);
    router.replace("/login");
  };

  return (
    <aside className="h-full border-b border-zinc-800 bg-zinc-950 px-3 py-4 lg:border-r lg:border-b-0">
      <div className="flex h-full flex-col">
        <div>
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
        </div>

        <div className="mt-6 border-t border-zinc-800 pt-4">
          {isLoadingAccount ? (
            <p className="px-2 text-xs text-zinc-500">Loading account...</p>
          ) : account && !accountError ? (
            <div className="space-y-3 px-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-200">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm text-zinc-200">
                    {account.user.name || account.user.email}
                  </p>
                  <p className="truncate text-xs text-zinc-500">{account.user.email}</p>
                </div>
              </div>
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-wide text-zinc-500">Team</p>
                <select
                  value={account.activeOrganization.id}
                  onChange={(event) => {
                    void onSwitchOrganization(event.target.value);
                  }}
                  disabled={isSwitchingOrg || account.memberships.length <= 1}
                  className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100 outline-none ring-cyan-500 focus:ring-2 disabled:opacity-60"
                >
                  {account.memberships.map((membership) => (
                    <option
                      key={membership.organization.id}
                      value={membership.organization.id}
                    >
                      {membership.organization.name} ({membership.role})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  void onLogout();
                }}
                disabled={isLoggingOut}
                className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 text-xs text-zinc-100 transition hover:bg-zinc-800 disabled:opacity-60"
              >
                {isLoggingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          ) : (
            <p className="px-2 text-xs text-zinc-500">{accountError || "Not signed in"}</p>
          )}
        </div>
      </div>
    </aside>
  );
}
