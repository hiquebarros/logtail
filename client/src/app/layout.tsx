import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { QueryProvider } from "@/components/providers/query-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Logtail Ops",
  description: "Modern log management frontend",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-zinc-950 text-zinc-100 antialiased`}
      >
        <QueryProvider>
          <div className="min-h-screen bg-zinc-950 text-zinc-100">
            <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
              <div className="mx-auto flex h-12 max-w-[1600px] items-center justify-between px-4">
                <div className="text-sm font-semibold tracking-wide text-zinc-100">
                  LOGTAIL OPS
                </div>
                <nav className="flex items-center gap-2 text-sm">
                  <Link
                    href="/"
                    className="rounded px-2 py-1 text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/logs"
                    className="rounded px-2 py-1 text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                  >
                    Logs
                  </Link>
                </nav>
              </div>
            </header>
            <div className="mx-auto max-w-[1600px]">{children}</div>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
