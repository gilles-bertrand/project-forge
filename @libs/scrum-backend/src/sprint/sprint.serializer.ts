import type { SprintEntityType } from "#src/sprint/sprint.entity.js";
import { number, object, string } from "zod";
import { z } from "zod";
import { makeJsonApiDocumentSchema } from "@libs/backend-shared";
import { SprintStatusSchema } from "#src/types.js";

export const SerializedSprintSchema = makeJsonApiDocumentSchema(
  "sprints",
  object({
    name: string(),
    goal: string().nullable(),
    projectId: string(),
    startDate: string(),
    endDate: string(),
    status: SprintStatusSchema,
    velocityPoints: number().int(),
    completedPoints: number().int(),
    createdAt: string(),
    updatedAt: string(),
  }),
);

export function jsonApiSerializeSprint(
  s: SprintEntityType,
): z.infer<typeof SerializedSprintSchema> {
  return {
    id: s.id,
    type: "sprints" as const,
    attributes: {
      name: s.name,
      goal: s.goal ?? null,
      projectId: s.projectId,
      startDate: s.startDate.toISOString(),
      endDate: s.endDate.toISOString(),
      status: s.status as z.infer<typeof SprintStatusSchema>,
      velocityPoints: s.velocityPoints,
      completedPoints: s.completedPoints,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    },
  };
}

export function jsonApiSerializeManySprints(sprints: SprintEntityType[]) {
  return sprints.map(jsonApiSerializeSprint);
}

export function jsonApiSerializeSingleSprintDocument(s: SprintEntityType) {
  return { data: jsonApiSerializeSprint(s) };
}
