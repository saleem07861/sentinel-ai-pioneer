// Fixed left navigation (desktop). Hidden below md — see MobileNav for small
// screens. Sign-out lives in the footer.

import { NavList } from "./nav";
import { SignOutButton } from "./SignOutButton";

export function Sidebar({ role }: { role?: string | null }) {
  return (
    <nav className="hidden h-full w-56 shrink-0 flex-col border-r border-border bg-surface-raised md:flex">
      <div className="flex-1 p-3">
        <NavList role={role} />
      </div>
      <div className="border-t border-border p-3">
        <SignOutButton />
      </div>
    </nav>
  );
}
