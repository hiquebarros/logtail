"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isPublicRoute =
    pathname === "/login" || pathname === "/register" || pathname === "/verify-email";

  if (isPublicRoute) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 lg:grid lg:grid-cols-[auto_1fr]">
      <Sidebar />
      <div className="min-w-0 pt-12 lg:pt-0">{children}</div>
    </div>
  );
}
