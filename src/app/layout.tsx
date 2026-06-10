import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import Link from "next/link";
import { Settings } from "lucide-react";
import ClientProviders from "@/components/ClientProviders";

export const metadata: Metadata = {
  title: "投注账本",
  description: "记录和追踪 2026 世界杯下注账目。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" className="h-full antialiased light">
      <body className="min-h-full bg-apple-bg text-apple-fg flex flex-col lg:flex-row">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Mobile Top Header */}
        <header className="lg:hidden flex items-center justify-between px-6 h-[56px] border-b border-apple-border/20 bg-apple-bg/80 backdrop-blur-xl fixed top-0 left-0 right-0 z-30">
          <span className="text-lg font-bold tracking-tight text-apple-fg">
            投注账本
          </span>
          <div className="flex items-center space-x-3">
            <span className="text-[11px] font-semibold tracking-wider text-apple-secondary-fg bg-apple-secondary-bg px-2.5 py-0.5 rounded-[4px] border border-apple-border/20">
              WC 2026
            </span>
            <Link
              href="/settings"
              className="p-1.5 rounded-full text-apple-secondary-fg hover:text-apple-fg hover:bg-apple-secondary-bg transition-colors"
            >
              <Settings size={18} />
            </Link>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 min-h-screen pt-[56px] pb-[80px] lg:pt-0 lg:pb-0 lg:pl-[260px] flex flex-col">
          <div className="flex-1 w-full max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-10">
            <ClientProviders>{children}</ClientProviders>
          </div>
        </main>

        {/* Mobile Tab Navigation */}
        <BottomNav />
      </body>
    </html>
  );
}
