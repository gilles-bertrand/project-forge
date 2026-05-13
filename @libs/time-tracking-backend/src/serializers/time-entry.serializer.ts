import type { TimeEntryEntityType } from "#src/entities/time-entry.entity.js";
import { number, object, string } from "zod";
import { z } from "zod";
import { makeJsonApiDocumentSchema } from "@libs/backend-shared";

export const SerializedTimeEntrySchema = makeJsonApiDocumentSchema(
  "time-entries",
  object({
    taskId: string(),
    userId: string(),
    projectId: string(),
    hours: number(),
    date: string(),
    description: string().nullable(),
    createdAt: string(),
  }),
);

export function jsonApiSerializeTimeEntry(
  e: TimeEntryEntityType,
): z.infer<typeof SerializedTimeEntrySchema> {
  return {
    id: e.id,
    type: "time-entries" as const,
    attributes: {
      taskId: e.taskId,
      userId: e.userId,
      projectId: e.projectId,
      hours: e.hours,
      date: e.date.toISOString(),
      description: e.description ?? null,
      createdAt: e.createdAt.toISOString(),
    },
  };
}

export function jsonApiSerializeManyTimeEntries(items: TimeEntryEntityType[]) {
  return items.map(jsonApiSerializeTimeEntry);
}

export function jsonApiSerializeSingleTimeEntryDocument(e: TimeEntryEntityType) {
  return { data: jsonApiSerializeTimeEntry(e) };
}
