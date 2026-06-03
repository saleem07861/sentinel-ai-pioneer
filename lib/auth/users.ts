// Auth: checks hardcoded demo users first, then database Person records.
// When adding a new person via My Team, a password is auto-generated and stored.

import { prisma } from "@/lib/prisma";

export type UserRole = "admin" | "teamLeader" | "associate";

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  password: string; // plaintext — demo only
  role: UserRole;
}

export const DEMO_USERS: DemoUser[] = [
  { id: "u_sarah", name: "Sarah Okafor", email: "sarah@meridian.legal", password: "admin123", role: "teamLeader" },
  { id: "u_james", name: "James Whitfield", email: "james@meridian.legal", password: "admin123", role: "associate" },
  { id: "u_admin", name: "Admin", email: "admin@sentinel.ai", password: "admin123", role: "admin" },
];

/** Returns matching user (without password) from hardcoded or database. */
export async function verifyCredentials(email?: unknown, password?: unknown) {
  if (typeof email !== "string" || typeof password !== "string") return null;
  const normalised = email.trim().toLowerCase();

  // Check hardcoded users first
  const hardcoded = DEMO_USERS.find((u) => u.email === normalised && u.password === password);
  if (hardcoded) return { id: hardcoded.id, name: hardcoded.name, email: hardcoded.email, role: hardcoded.role };

  // Check database Person records
  try {
    const person = await prisma.person.findFirst({
      where: { email: normalised, password, isActive: true },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
    });
    if (person) {
      return {
        id: person.id,
        name: `${person.firstName} ${person.lastName}`,
        email: person.email,
        role: person.role,
      };
    }
  } catch {
    // DB might not be available (e.g. during build) — fall through
  }

  return null;
}
