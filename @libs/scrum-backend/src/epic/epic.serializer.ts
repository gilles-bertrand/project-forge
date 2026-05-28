import type { EpicEntityType } from "#src/epic/epic.entity.js";
import { array, number, object, string } from "zod";
import { z } from "zod";
import { makeJsonApiDocumentSchema } from "@libs/backend-shared";
import { EpicStatusSchema, EpicTypeSchema } from "#src/types.js";

export const SerializedEpicSchema = makeJsonApiDocumentSchema(
  "epics",
  object({
    title: string(),
    description: string(),
    notes: string().nullable(),
    color: string(),
    type: EpicTypeSchema,
    value: number().int().nullable(),
    rank: number().int(),
    projectId: string(),
    createdById: string().nullable(),
    status: EpicStatusSchema,
    tags: array(string()),
    createdAt: string(),
    updatedAt: string(),
  }),
);

export function jsonApiSerializeEpic(e: EpicEntityType): z.infer<typeof SerializedEpicSchema> {
  return {
    id: e.id,
    type: "epics" as const,
    attributes: {
      title: e.title,
      description: e.description,
      notes: e.notes ?? null,
      color: e.color,
      type: e.type as z.infer<typeof EpicTypeSchema>,
      value: e.value ?? null,
      rank: e.rank,
      projectId: e.projectId,
      createdById: e.createdById ?? null,
      status: e.status as z.infer<typeof EpicStatusSchema>,
      tags: (e.tags ?? []) as string[],
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    },
  };
}

export function jsonApiSerializeManyEpics(epics: EpicEntityType[]) {
  return epics.map(jsonApiSerializeEpic);
}

export function jsonApiSerializeSingleEpicDocument(e: EpicEntityType) {
  return { data: jsonApiSerializeEpic(e) };
}
