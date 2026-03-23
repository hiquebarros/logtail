"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type NavItem = {
  label: string;
  href: string;
  icon: JSX.Element;
};

type MainSection = "telemetry" | "configurations";

type MainSectionItem = {
  key: MainSection;
  label: string;
  href: string;
  icon: JSX.Element;
};

const mainSections: MainSectionItem[] = [
  { key: "telemetry", label: "Telemetry", href: "/services", icon: <ChartIcon /> },
  { key: "configurations", label: "Configurations", href: "/configurations", icon: <GearIcon /> },
];

const telemetryItems: NavItem[] = [
  { label: "Services", href: "/services", icon: <SquaresIcon /> },
  { label: "Live Tail", href: "/logs", icon: <LinesIcon /> },
  { label: "Metrics", href: "/dashboard", icon: <ChartIcon /> },
];

const configurationItems: NavItem[] = [
  { label: "Account settings", href: "/configurations", icon: <SlidersIcon /> },
];

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

function NavLink({
  item,
  activePath,
}: {
  item: NavItem;
  activePath: string;
}) {
  const isActive = activePath === item.href;

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-2 rounded-md transition ${
        isActive ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
      }`}
    >
      <span className="shrink-0">{item.icon}</span>
      <span className="text-sm">{item.label}</span>
    </Link>
  );
}

function MainSectionLink({
  section,
  activeSection,
}: {
  section: MainSectionItem;
  activeSection: MainSection;
}) {
  const isActive = activeSection === section.key;

  return (
    <Link
      href={section.href}
      title={section.label}
      className={`relative flex h-9 w-9 items-center justify-center rounded-md transition ${
        isActive ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
      }`}
    >
      {isActive && <div className="absolute -left-[6px] h-4 w-[2px] rounded-r bg-cyan-400" />}
      {section.icon}
      <span className="sr-only">{section.label}</span>
    </Link>
  );
}

function IconWrap({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex h-5 w-5 items-center justify-center">{children}</span>;
}

function SquaresIcon() {
  return (
    <IconWrap>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
      </svg>
    </IconWrap>
  );
}

function LinesIcon() {
  return (
    <IconWrap>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 6h16M4 12h10M4 18h7" />
      </svg>
    </IconWrap>
  );
}

function ChartIcon() {
  return (
    <IconWrap>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 19h16M7 16v-5M12 16V8M17 16v-9" />
      </svg>
    </IconWrap>
  );
}

function SlidersIcon() {
  return (
    <IconWrap>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 6h8M15 6h5M10 6v0M4 12h3M10 12h10M7 12v0M4 18h12M19 18h1M16 18v0" />
      </svg>
    </IconWrap>
  );
}

function GearIcon() {
  return (
    <IconWrap>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 8.5A3.5 3.5 0 1 0 12 15.5A3.5 3.5 0 1 0 12 8.5z" />
        <path d="M19.4 15a7.9 7.9 0 0 0 .1-1l1.7-1.3l-1.7-3l-2.1.4a7.6 7.6 0 0 0-.9-.6L16 7.3l-3.4-1l-1 1.8a6.7 6.7 0 0 0-1.1 0l-1-1.8L6.1 7.3l-.5 2.2a7.5 7.5 0 0 0-.9.6l-2.1-.4l-1.7 3L2.6 14a7.5 7.5 0 0 0 .1 1L1 16.3l1.7 3l2.1-.4a7.5 7.5 0 0 0 .9.6l.5 2.2l3.4 1l1-1.8a6.7 6.7 0 0 0 1.1 0l1 1.8l3.4-1l.5-2.2a7.6 7.6 0 0 0 .9-.6l2.1.4l1.7-3L19.4 15z" />
      </svg>
    </IconWrap>
  );
}

function BellIcon() {
  return (
    <IconWrap>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M7 9a5 5 0 1 1 10 0v3l2 2v1H5v-1l2-2zM10 17a2 2 0 0 0 4 0" />
      </svg>
    </IconWrap>
  );
}

function BarsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const [account, setAccount] = useState<MePayload | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);
  const [isSwitchingOrg, setIsSwitchingOrg] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
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
  const activeMainSection: MainSection = pathname.startsWith("/configurations")
    ? "configurations"
    : "telemetry";
  const panelItems = activeMainSection === "telemetry" ? telemetryItems : configurationItems;

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

  useEffect(() => {
    if (!isUserMenuOpen) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!userMenuRef.current) {
        return;
      }

      if (userMenuRef.current.contains(event.target as Node)) {
        return;
      }

      setIsUserMenuOpen(false);
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, [isUserMenuOpen]);

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
    setIsUserMenuOpen(false);
    setIsLoggingOut(true);
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include"
    });
    setIsLoggingOut(false);
    router.replace("/login");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsMobileOpen((value) => !value);
        }}
        className="fixed left-3 top-3 z-40 flex h-9 w-9 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-zinc-100 lg:hidden"
      >
        <BarsIcon />
        <span className="sr-only">Toggle navigation</span>
      </button>

      {isMobileOpen && (
        <button
          type="button"
          onClick={() => {
            setIsMobileOpen(false);
          }}
          className="fixed inset-0 z-20 bg-zinc-950/60 lg:hidden"
        />
      )}

      <aside
        className={`fixed bottom-0 top-0 z-30 flex items-stretch border-r border-zinc-800 bg-zinc-950 transition-all lg:sticky lg:top-0 ${
          isMobileOpen ? "left-0" : "-left-[272px] lg:left-0"
        } w-[272px]`}
      >
        <div className="flex w-[52px] flex-col justify-between border-r border-zinc-800 py-3">
          <div className="flex min-h-[220px] flex-col items-center">
            <div className="mb-2 hidden h-[52px] items-center justify-center lg:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-[11px] font-bold text-zinc-200">
                LO
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsMobileOpen((value) => !value);
              }}
              className="flex h-[52px] w-8 items-center justify-center text-zinc-300 lg:hidden"
            >
              <BarsIcon />
            </button>

            <div className="mt-1 flex flex-col items-center gap-2">
              {mainSections.map((section) => (
                <MainSectionLink
                  key={section.key}
                  section={section}
                  activeSection={activeMainSection}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 px-2">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-200"
            >
              <BellIcon />
              <span className="sr-only">Notifications</span>
            </button>
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen((value) => !value);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-xs font-semibold text-zinc-300 transition hover:border-zinc-500"
              >
                {initials}
                <span className="sr-only">Open account menu</span>
              </button>

              {isUserMenuOpen && (
                <div className="absolute bottom-0 left-11 z-40 w-64 rounded-lg border border-zinc-700 bg-zinc-900 p-3 shadow-2xl">
                  {isLoadingAccount ? (
                    <p className="text-xs text-zinc-500">Loading account...</p>
                  ) : account && !accountError ? (
                    <div className="space-y-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-zinc-200">
                          {account.user.name || account.user.email}
                        </p>
                        <p className="truncate text-xs text-zinc-500">{account.user.email}</p>
                      </div>
                      <div>
                        <p className="mb-1 text-[11px] uppercase tracking-wide text-zinc-500">Team</p>
                        <select
                          value={account.activeOrganization.id}
                          onChange={(event) => {
                            void onSwitchOrganization(event.target.value);
                          }}
                          disabled={isSwitchingOrg || account.memberships.length <= 1}
                          className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-100 outline-none ring-cyan-500 focus:ring-2 disabled:opacity-60"
                        >
                          {account.memberships.map((membership) => (
                            <option key={membership.organization.id} value={membership.organization.id}>
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
                        className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-950 text-xs text-zinc-100 transition hover:bg-zinc-800 disabled:opacity-60"
                      >
                        {isLoggingOut ? "Signing out..." : "Sign out"}
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500">{accountError || "Not signed in"}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-[220px] border-r border-zinc-800">
          <div className="flex h-full flex-col pt-2.5">
            <div className="mb-3 flex h-[34px] items-center justify-between pl-4 pr-2">
              <span className="text-sm font-semibold text-zinc-100">
                {activeMainSection === "telemetry" ? "Telemetry" : "Configurations"}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-y-2 overflow-y-auto px-3 pb-3">
              <section>
                <div className="space-y-1">
                  {panelItems.map((item) => (
                    <NavLink key={item.href} item={item} activePath={activePath} />
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
