import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Audit context carried by AsyncLocalStorage.
 *
 * Populated by the Fastify `withAuditContext` hook (per request, right after JWT
 * auth) and consumed by `AuditSubscriber` to attach a `userId` to every
 * `HistoryEntryEntity` generated during the flush of a request-bound transaction.
 *
 * If the store is empty (seeders, cron jobs, CLI scripts) the subscriber returns
 * silently — no audit row is created.
 */
export interface AuditContextStore {
  userId: string;
}

export const auditContext = new AsyncLocalStorage<AuditContextStore>();
