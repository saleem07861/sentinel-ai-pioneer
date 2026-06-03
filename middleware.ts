// Middleware disabled — auth handled by layout-level session check.
// NextAuth v5 middleware uses crypto which Edge Runtime does not support.
// Each page also has role-based guards where needed.

export function middleware() {
  // No-op: auth is handled by RootLayout (redirects to /login when no session)
}

export const config = {
  matcher: [],
};
