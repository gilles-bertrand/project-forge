import type { HistoryEntryEntityType } from "#src/task/history-entry.entity.js";
import { object, record, string, unknown } from "zod";
import { z } from "zod";
import { makeJsonApiDocumentSchema } from "@libs/backend-shared";

export const SerializedHistoryEntrySchema = makeJsonApiDocumentSchema(
  "history-entries",
  object({
    ownerType: string(),
    ownerId: string(),
    type: string(),
    description: string(),
    userId: string(),
    metadata: record(string(), unknown()).nullable(),
    createdAt: string(),
  }),
);

export function jsonApiSerializeHistoryEntry(
  h: HistoryEntryEntityType,
): z.infer<typeof SerializedHistoryEntrySchema> {
  return {
    id: h.id,
    type: "history-entries" as const,
    attributes: {
      ownerType: h.ownerType,
      ownerId: h.ownerId,
      type: h.type,
      description: h.description,
      userId: h.userId,
      metadata: (h.metadata as Record<string, unknown> | null) ?? null,
      createdAt: h.createdAt.toISOString(),
    },
  };
}

export function jsonApiSerializeManyHistoryEntries(items: HistoryEntryEntityType[]) {
  return items.map(jsonApiSerializeHistoryEntry);
}
