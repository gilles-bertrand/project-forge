import type { AttachmentEntityType } from "#src/task/attachment.entity.js";
import { number, object, string } from "zod";
import { z } from "zod";
import { makeJsonApiDocumentSchema } from "@libs/backend-shared";

export const SerializedAttachmentSchema = makeJsonApiDocumentSchema(
  "attachments",
  object({
    taskId: string().nullable(),
    projectId: string().nullable(),
    name: string(),
    url: string(),
    mimeType: string(),
    sizeBytes: number().int(),
    uploadedById: string(),
    createdAt: string(),
  }),
);

export function jsonApiSerializeAttachment(
  a: AttachmentEntityType,
): z.infer<typeof SerializedAttachmentSchema> {
  return {
    id: a.id,
    type: "attachments" as const,
    attributes: {
      taskId: a.taskId ?? null,
      projectId: a.projectId ?? null,
      name: a.name,
      url: a.url,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      uploadedById: a.uploadedById,
      createdAt: a.createdAt.toISOString(),
    },
  };
}

export function jsonApiSerializeManyAttachments(items: AttachmentEntityType[]) {
  return items.map(jsonApiSerializeAttachment);
}
