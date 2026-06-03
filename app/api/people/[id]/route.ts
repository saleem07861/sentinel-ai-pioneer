// PATCH /api/people/[id] — update a person's details including password
// DELETE /api/people/[id]?organisationId=... — soft-delete a person (Admin + Team Leader only)

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { badRequest, jsonOk, notFound, serverError } from "@/lib/http";

export const dynamic = "force-dynamic";

function forbidden() {
  return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();
    const userRole = (session?.user as { role?: string })?.role;
    if (userRole !== "admin" && userRole !== "teamLeader") return forbidden();

    const { id } = params;
    if (!id) return badRequest("person id is required");

    let body: unknown;
    try { body = await request.json(); } catch { return badRequest("Invalid JSON"); }
    const { firstName, lastName, jobTitle, role, password } = (body ?? {}) as Record<string, unknown>;

    const data: Record<string, string> = {};
    if (typeof firstName === "string" && firstName.trim()) data.firstName = firstName.trim();
    if (typeof lastName === "string" && lastName.trim()) data.lastName = lastName.trim();
    if (jobTitle !== undefined) data.jobTitle = typeof jobTitle === "string" ? jobTitle.trim() : "";
    if (role === "teamLeader" || role === "associate") data.role = role;
    if (typeof password === "string" && password.trim()) data.password = password.trim();

    if (Object.keys(data).length === 0) return badRequest("No fields to update");

    const person = await prisma.person.update({ where: { id }, data });
    return jsonOk(person);
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (role !== "admin" && role !== "teamLeader") return forbidden();

    const { id } = params;
    if (!id) return badRequest("person id is required");

    const url = new URL(request.url);
    const organisationId = url.searchParams.get("organisationId");
    if (!organisationId) return badRequest("organisationId is required");

    const person = await prisma.person.findFirst({
      where: { id, organisationId, isActive: true },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!person) return notFound("Person not found");

    await prisma.person.update({
      where: { id },
      data: { isActive: false },
    });

    return jsonOk({
      removed: true,
      id,
      name: `${person.firstName} ${person.lastName}`,
    });
  } catch (error) {
    return serverError(error);
  }
}
