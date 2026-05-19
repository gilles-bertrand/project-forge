import type { EpicEntityType } from "#src/epic/epic.entity.js";
import { object, string } from "zod";
import { z } from "zod";
import { makeJsonApiDocumentSchema } from "@libs/backend-shared";
import { EpicStatusSchema } from "#src/types.js";

export const SerializedEpicSchema = makeJsonApiDocumentSchema(
  "epics",
  object({
    title: string(),
    description: string(),
    projectId: string(),
    status: EpicStatusSchema,
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
      projectId: e.projectId,
      status: e.status as z.infer<typeof EpicStatusSchema>,
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
