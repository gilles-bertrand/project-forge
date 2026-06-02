import { randomUUID } from "node:crypto";
import {
  ChangeSetType,
  type ChangeSet,
  type EntityManager,
  type EventSubscriber,
  type FlushEventArgs,
  type UnitOfWork,
} from "@mikro-orm/core";
import { HistoryEntryEntity } from "#src/task/history-entry.entity.js";
import { auditContext } from "#src/audit/audit-context.js";

/**
 * Maps MikroORM entity class names to the `ownerType` discriminator stored in
 * `HistoryEntryEntity`. `HistoryEntry` is absent to prevent an audit loop.
 */
const AUDITED_ENTITIES = new Map<string, string>([
  ["Epic", "epic"],
  ["UserStory", "story"],
  ["Task", "task"],
  ["Sprint", "sprint"],
]);

/** Champs scalaires (hors `status`) tracés par ownerType → entrée lisible. */
const AUDITED_FIELDS: Record<string, { field: string; label: string }[]> = {
  epic: [{ field: "title", label: "Titre" }],
  story: [
    { field: "title", label: "Titre" },
    { field: "priority", label: "Priorité" },
    { field: "points", label: "Points" },
  ],
  task: [
    { field: "title", label: "Titre" },
    { field: "priority", label: "Priorité" },
    { field: "points", label: "Points" },
  ],
  sprint: [],
};

type AnyChangeSet = ChangeSet<{ id: string } & Record<string, unknown>>;

interface Ctx {
  em: EntityManager;
  uow: UnitOfWork;
  userId: string;
  now: Date;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "∅";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function pushEntry(
  ctx: Ctx,
  ownerType: string,
  ownerId: string,
  type: string,
  description: string,
  metadata: Record<string, unknown>,
): void {
  const entry = ctx.em.create(HistoryEntryEntity, {
    id: randomUUID(),
    ownerType,
    ownerId,
    type,
    description,
    userId: ctx.userId,
    metadata,
    createdAt: ctx.now,
  });
  // Register in the current UoW so it's persisted in the same flush.
  ctx.uow.computeChangeSet(entry);
}

function recordStatusChange(ctx: Ctx, cs: AnyChangeSet, ownerType: string): void {
  const payload = cs.payload as Record<string, unknown>;
  if (!("status" in payload)) return;
  const to = typeof payload.status === "string" ? payload.status : undefined;
  if (!to) return;
  const fromRaw = cs.originalEntity?.status;
  const from = typeof fromRaw === "string" ? fromRaw : undefined;
  if (from === to) return;

  pushEntry(ctx, ownerType, cs.entity.id, "status-change", `Status ${from ?? "∅"} → ${to}`, {
    from: from ?? null,
    to,
  });
}

function recordFieldChanges(ctx: Ctx, cs: AnyChangeSet, ownerType: string): void {
  const payload = cs.payload as Record<string, unknown>;
  const original = cs.originalEntity as Record<string, unknown> | undefined;
  for (const { field, label } of AUDITED_FIELDS[ownerType] ?? []) {
    if (!(field in payload)) continue;
    const to = payload[field];
    const from = original?.[field];
    if (from === to) continue;
    pushEntry(
      ctx,
      ownerType,
      cs.entity.id,
      `${field}-change`,
      `${label} : ${formatValue(from)} → ${formatValue(to)}`,
      { field, from: from ?? null, to: to ?? null },
    );
  }
}

function recordAssigneeChange(ctx: Ctx, cs: AnyChangeSet): void {
  const e = cs.entity as unknown as { taskId: string; userId: string };
  if (cs.type === ChangeSetType.CREATE) {
    pushEntry(ctx, "task", e.taskId, "assignee-added", "Assigné", { userId: e.userId });
  } else if (cs.type === ChangeSetType.DELETE) {
    pushEntry(ctx, "task", e.taskId, "assignee-removed", "Désassigné", { userId: e.userId });
  }
}

/**
 * Materialises an audit trail for Epic / UserStory / Task / Sprint: status
 * transitions, scalar edits (title, priority, points) and task assignee
 * add/remove. Silent when no `userId` is present in `auditContext`.
 */
export class AuditSubscriber implements EventSubscriber {
  public async onFlush(args: FlushEventArgs): Promise<void> {
    const userId = auditContext.getStore()?.userId;
    if (!userId) return;

    const ctx: Ctx = { em: args.em, uow: args.uow, userId, now: new Date() };

    // Snapshot before we add new change sets via uow.computeChangeSet().
    const initial = [...args.uow.getChangeSets()];
    for (const cs of initial) {
      const className = cs.meta?.className ?? "";
      if (className === "TaskAssignee") {
        recordAssigneeChange(ctx, cs as unknown as AnyChangeSet);
        continue;
      }
      const ownerType = AUDITED_ENTITIES.get(className);
      if (!ownerType) continue;
      recordStatusChange(ctx, cs as unknown as AnyChangeSet, ownerType);
      recordFieldChanges(ctx, cs as unknown as AnyChangeSet, ownerType);
    }
  }
}
