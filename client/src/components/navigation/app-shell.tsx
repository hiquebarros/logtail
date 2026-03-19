"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isPublicRoute = pathname === "/login";

  if (isPublicRoute) {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto min-h-screen max-w-[1600px] bg-zinc-950 text-zinc-100 lg:grid lg:grid-cols-[240px_1fr]">
      <Sidebar />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
