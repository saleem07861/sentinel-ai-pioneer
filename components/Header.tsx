// Top header: hamburger (mobile) + wordmark (left); signed-in user (right).

import type { ReactNode } from "react";

export function Header({
  userName,
  mobileNav,
}: {
  userName?: string | null;
  mobileNav?: ReactNode;
}) {
  return (
    <header className="flex h-16 w-full items-center justify-between gap-3 border-b border-border bg-surface-raised px-4 sm:px-6">
      <div className="flex items-center gap-3">
        {mobileNav}
        <div className="flex h-8 w-8 items-center justify-center rounded-md" style={{ backgroundColor: "var(--accent)" }}>
          <span className="text-sm font-bold text-white">S</span>
        </div>
        <div>
          <div className="text-base font-semibold leading-tight text-text-primary">Sentinel AI</div>
          <div className="hidden text-xs leading-tight text-text-muted sm:block">Organisational Intelligence Platform</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {userName ? (
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-xs font-semibold text-text-secondary">
              {userName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </span>
            <span className="hidden text-sm font-medium text-text-primary sm:inline">{userName}</span>
          </div>
        ) : null}
      </div>
    </header>
  );
}
