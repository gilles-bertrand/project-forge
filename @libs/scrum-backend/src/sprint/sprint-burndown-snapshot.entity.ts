import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const SprintBurndownSnapshotEntity = defineEntity({
  name: "SprintBurndownSnapshot",
  tableName: "sprint_burndown_snapshots",
  properties: {
    id: p.string().primary(),
    sprintId: p.string().index(),
    snapshotDate: p.datetime().index(),
    remainingHoursTotal: p.float().default(0),
    remainingPointsTotal: p.integer().default(0),
    taskCount: p.integer().default(0),
    createdAt: p.datetime().onCreate(() => new Date()),
  },
});

export type SprintBurndownSnapshotEntityType = InferEntity<typeof SprintBurndownSnapshotEntity>;
