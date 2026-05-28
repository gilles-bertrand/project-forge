import { randomUUID } from "node:crypto";
import type {
  ChangeSet,
  EntityManager,
  EventSubscriber,
  FlushEventArgs,
  UnitOfWork,
} from "@mikro-orm/core";
import { HistoryEntryEntity } from "#src/task/history-entry.entity.js";
import { auditContext } from "#src/audit/audit-context.js";

/**
 * Maps MikroORM entity class names (the `name:` passed to `defineEntity`) to the
 * `ownerType` discriminator stored in `HistoryEntryEntity`.
 *
 * `HistoryEntry` is intentionally absent to prevent an infinite audit loop.
 */
const AUDITED_ENTITIES = new Map<string, string>([
  ["Epic", "epic"],
  ["UserStory", "story"],
  ["Task", "task"],
  ["Sprint", "sprint"],
]);

type StatusedChangeSet = ChangeSet<{ id: string; status: unknown }>;

interface AuditTrailInputs {
  em: EntityManager;
  uow: UnitOfWork;
  changeSet: StatusedChangeSet;
  ownerType: string;
  userId: string;
  now: Date;
}

function readStatus(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function recordStatusChange({
  em,
  uow,
  changeSet,
  ownerType,
  userId,
  now,
}: AuditTrailInputs): void {
  const payload = changeSet.payload as Record<string, unknown>;
  if (!("status" in payload)) return;

  const to = readStatus(payload.status);
  if (!to) return;
  const from = readStatus(changeSet.originalEntity?.status);
  if (from === to) return;

  const entry = em.create(HistoryEntryEntity, {
    id: randomUUID(),
    ownerType,
    ownerId: changeSet.entity.id,
    type: "status-change",
    description: `Status ${from ?? "∅"} → ${to}`,
    userId,
    metadata: { from: from ?? null, to },
    createdAt: now,
  });
  // Register the new entity in the current UoW so it's persisted in the same flush.
  uow.computeChangeSet(entry);
}

/**
 * Subscriber that materialises an audit trail for status transitions on
 * Epic / UserStory / Task / Sprint.
 *
 * Hooked into `onFlush` so the new `HistoryEntryEntity` rows are persisted in
 * the same UoW as the originating change. The subscriber is silent when no
 * `userId` is present in `auditContext` (seeders, CLI jobs, internal cascade
 * work).
 */
export class AuditSubscriber implements EventSubscriber {
  public async onFlush(args: FlushEventArgs): Promise<void> {
    const userId = auditContext.getStore()?.userId;
    if (!userId) return;

    const now = new Date();
    const em = args.em;
    const uow = args.uow;

    // Snapshot change sets BEFORE we start adding new ones via uow.computeChangeSet().
    const initial = [...uow.getChangeSets()];
    for (const changeSet of initial) {
      const ownerType = AUDITED_ENTITIES.get(changeSet.meta?.className ?? "");
      if (!ownerType) continue;

      recordStatusChange({
        em,
        uow,
        changeSet: changeSet as unknown as StatusedChangeSet,
        ownerType,
        userId,
        now,
      });
    }
  }
}
