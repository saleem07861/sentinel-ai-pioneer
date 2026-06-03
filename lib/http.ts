// Shared HTTP helpers for API route handlers.
// Stack traces are logged server-side only and never returned to the client.

export function jsonOk(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export function badRequest(message: string): Response {
  return Response.json({ error: message }, { status: 400 });
}

export function notFound(message: string): Response {
  return Response.json({ error: message }, { status: 404 });
}

export function serverError(error: unknown): Response {
  // Full error (incl. stack) stays in server logs; client gets the message only.
  console.error("[api] unexpected error:", error);
  const message = error instanceof Error ? error.message : "Unexpected server error";
  return Response.json({ error: message }, { status: 500 });
}

/** Service "not found / inactive" errors are surfaced as 404, not 500. */
export function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && /not found|is inactive/i.test(error.message);
}

/** True if `value` is a member of the given enum object. */
export function isEnumValue<T extends Record<string, string>>(
  e: T,
  value: unknown,
): value is T[keyof T] {
  return typeof value === "string" && (Object.values(e) as string[]).includes(value);
}

/** Reads a required query param, or returns null (caller emits 400). */
export function requireParam(url: URL, name: string): string | null {
  const value = url.searchParams.get(name);
  return value && value.trim() !== "" ? value : null;
}
