// NextAuth v5 (Auth.js) configuration.
// Credentials provider against hardcoded demo users — no database adapter.
// Sessions are NOT linked to the Person model yet.
//
// Replace with database-backed auth before production.

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyCredentials } from "@/lib/auth/users";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        return verifyCredentials(credentials?.email, credentials?.password);
      },
    }),
  ],
  callbacks: {
    // Persist id + role onto the JWT.
    jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    // Expose id + role on the session.user object.
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});
