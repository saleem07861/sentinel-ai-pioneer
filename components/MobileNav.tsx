"use client";

// Hamburger + slide-over drawer for screens < md. Renders the same nav and
// sign-out as the desktop sidebar.

import { useState } from "react";
import { NavList } from "./nav";
import { SignOutButton } from "./SignOutButton";

export function MobileNav({ role }: { role?: string | null }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-text-secondary"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setOpen(false)}>
          <div
            className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-border bg-surface-raised"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-semibold text-text-primary">Sentinel AI</span>
              <button aria-label="Close menu" onClick={() => setOpen(false)} className="text-text-muted">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <NavList role={role} onNavigate={() => setOpen(false)} />
            </div>
            <div className="border-t border-border p-3">
              <SignOutButton />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
