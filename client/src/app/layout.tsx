import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/navigation/sidebar";
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
          <div className="mx-auto min-h-screen max-w-[1600px] bg-zinc-950 text-zinc-100 lg:grid lg:grid-cols-[240px_1fr]">
            <Sidebar />
            <div className="min-w-0">{children}</div>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
