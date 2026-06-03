import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { getDefaultOrganisation } from "@/lib/org";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: { default: "Sentinel AI", template: "Sentinel AI — %s" },
  description: "Light-first, human-approved organisational intelligence.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Unauthenticated (i.e. the /login page) renders without the app shell.
  if (!session?.user) {
    return (
      <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <body className="font-sans bg-surface">
          <header className="border-b border-border bg-surface-raised px-6 py-4">
            <div className="mx-auto flex max-w-4xl items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md text-white text-sm font-bold" style={{ backgroundColor: "var(--accent)" }}>S</div>
                <span className="text-lg font-semibold text-text-primary">Sentinel AI</span>
              </div>
              <span className="text-xs text-text-muted">Contract Review Platform</span>
            </div>
          </header>
          <main className="mx-auto max-w-4xl p-6">{children}</main>
        </body>
      </html>
    );
  }

  const org = await getDefaultOrganisation();
  const role = (session.user as { role?: string }).role ?? null;

  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans">
        <div className="flex h-screen flex-col">
          <Header
            userName={session.user.name}
            mobileNav={<MobileNav role={role} />}
          />
          <div className="flex min-h-0 flex-1">
            <Sidebar role={role} />
            <main className="min-w-0 flex-1 overflow-y-auto bg-surface p-4 sm:p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
