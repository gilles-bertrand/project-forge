import type { SprintBurndownSnapshotEntityType } from "#src/sprint/sprint-burndown-snapshot.entity.js";
import { number, object, string } from "zod";
import { z } from "zod";
import { makeJsonApiDocumentSchema } from "@libs/backend-shared";

export const SerializedSprintBurndownSnapshotSchema = makeJsonApiDocumentSchema(
  "sprint-burndown-snapshots",
  object({
    sprintId: string(),
    snapshotDate: string(),
    remainingHoursTotal: number(),
    remainingPointsTotal: number().int(),
    taskCount: number().int(),
    createdAt: string(),
  }),
);

export function jsonApiSerializeSprintBurndownSnapshot(
  s: SprintBurndownSnapshotEntityType,
): z.infer<typeof SerializedSprintBurndownSnapshotSchema> {
  return {
    id: s.id,
    type: "sprint-burndown-snapshots" as const,
    attributes: {
      sprintId: s.sprintId,
      snapshotDate: s.snapshotDate.toISOString(),
      remainingHoursTotal: s.remainingHoursTotal,
      remainingPointsTotal: s.remainingPointsTotal,
      taskCount: s.taskCount,
      createdAt: s.createdAt.toISOString(),
    },
  };
}

export function jsonApiSerializeSingleSprintBurndownSnapshotDocument(
  s: SprintBurndownSnapshotEntityType,
) {
  return { data: jsonApiSerializeSprintBurndownSnapshot(s) };
}
