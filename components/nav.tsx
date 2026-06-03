"use client";

// Shared navigation items + list, used by both the desktop sidebar and the
// mobile drawer. Active item: orange left border + orange text.

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const ic = "h-[18px] w-[18px]";
const I = {
  dashboard: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={ic}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>),
  documents: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={ic}><path d="M14 3v5h5" /><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2z" /></svg>),
  clauses: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={ic}><path d="M4 6h16M4 12h10M4 18h13" /></svg>),
  decisions: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={ic}><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>),
  knowledge: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={ic}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>),
  audit: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={ic}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>),
  people: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={ic}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>),
  settings: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={ic}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 7.6 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3 14.6a1.65 1.65 0 0 0-1.51-1H1a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 2.6 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 3V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 2.82 1.17l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 21 9h.09a2 2 0 1 1 0 4H21a1.65 1.65 0 0 0-1.51 1z" /></svg>),
};

interface NavItem { href: string; label: string; icon: ReactNode; adminOnly?: boolean; teamLeader?: boolean; }

export const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: I.dashboard },
  { href: "/documents", label: "Documents", icon: I.documents },
  { href: "/clauses", label: "Clauses", icon: I.clauses },
  { href: "/decisions", label: "Decisions", icon: I.decisions },
  { href: "/knowledge", label: "Knowledge", icon: I.knowledge },
  { href: "/help", label: "Help", icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={ic}><circle cx="12" cy="12" r="9"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/></svg>) },
  { href: "/audit", label: "Audit", icon: I.audit, teamLeader: true },
  { href: "/people", label: "My Team", icon: I.people, teamLeader: true },
  { href: "/settings", label: "Settings", icon: I.settings, adminOnly: true },
];

export function NavList({ role, onNavigate }: { role?: string | null; onNavigate?: () => void }) {
  const pathname = usePathname();
  const isAdmin = role === "admin";
  const isTeamLead = role === "teamLeader";
  const canManage = isAdmin || isTeamLead;
  const visibleItems = NAV.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.teamLeader && !canManage) return false;
    return true;
  });

  return (
    <ul className="flex flex-col gap-0.5">
      {visibleItems.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className="flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm font-medium transition-colors"
              style={active
                ? { borderLeftColor: "var(--accent)", color: "var(--accent)", backgroundColor: "var(--accent-soft)" }
                : { borderLeftColor: "transparent", color: "var(--text-secondary)" }}
            >
              {item.icon}
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
