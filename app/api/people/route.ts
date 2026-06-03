// GET  /api/people?organisationId=... — list active people
// POST /api/people — add a person (Admin + Team Leader only)

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { badRequest, jsonOk, serverError, requireParam } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const organisationId = requireParam(url, "organisationId");
    if (!organisationId) return badRequest("organisationId is required");

    const people = await prisma.person.findMany({
      where: { organisationId, isActive: true },
      orderBy: { firstName: "asc" },
    });

    return jsonOk({ people });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (role !== "admin" && role !== "teamLeader") return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Request body must be valid JSON");
    }

    const { organisationId, firstName, lastName, email, jobTitle } =
      (body ?? {}) as Record<string, unknown>;

    if (!organisationId || typeof organisationId !== "string")
      return badRequest("organisationId is required");
    if (!firstName || typeof firstName !== "string")
      return badRequest("firstName is required");
    if (!lastName || typeof lastName !== "string")
      return badRequest("lastName is required");
    if (!email || typeof email !== "string")
      return badRequest("email is required");

    // Check duplicate email
    const existing = await prisma.person.findFirst({
      where: { organisationId, email, isActive: true },
      select: { id: true },
    });
    if (existing) {
      return badRequest("A person with this email already exists in the organisation");
    }

    // Default password
    const generatedPassword = "admin123";

    const person = await prisma.person.create({
      data: {
        organisationId,
        firstName,
        lastName,
        email,
        jobTitle: typeof jobTitle === "string" ? jobTitle : null,
        password: generatedPassword,
        isActive: true,
      },
    });

    return jsonOk({ ...person, generatedPassword }, 201);
  } catch (error) {
    return serverError(error);
  }
}
