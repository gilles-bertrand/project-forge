import type { FastifyReply, FastifyRequest } from "fastify";
import { auditContext } from "#src/audit/audit-context.js";

interface AuthenticatedUserShape {
  id: string;
}

function extractUserId(request: FastifyRequest): string | undefined {
  const user = (request as unknown as { user?: AuthenticatedUserShape | null }).user;
  return user?.id;
}

/**
 * Fastify `preHandler` hook that registers the authenticated user in the
 * `auditContext` AsyncLocalStorage for the remainder of the request.
 *
 * Must be registered **after** the JWT auth middleware — otherwise
 * `request.user` is `undefined` and the audit trail is silently skipped.
 *
 * Uses `enterWith` so every async branch spawned by the route handler
 * inherits the store, including the MikroORM flush triggered by routes.
 */
export async function withAuditContext(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const userId = extractUserId(request);
  if (userId) {
    auditContext.enterWith({ userId });
  }
}
