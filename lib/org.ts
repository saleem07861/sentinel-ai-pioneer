// Resolves the active organisation for the UI. Single-tenant for the MVP:
// returns Meridian Legal (by slug), falling back to the first active org.

import { prisma } from "./prisma";

export async function getDefaultOrganisation() {
  const bySlug = await prisma.organisation.findFirst({
    where: { slug: "meridian-legal", isActive: true },
    include: { settings: true },
  });
  if (bySlug) return bySlug;

  return prisma.organisation.findFirst({
    where: { isActive: true },
    include: { settings: true },
    orderBy: { createdAt: "asc" },
  });
}
