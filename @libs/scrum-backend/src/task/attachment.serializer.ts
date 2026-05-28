import type { AttachmentEntityType } from "#src/task/attachment.entity.js";
import { number, object, string } from "zod";
import { z } from "zod";
import { makeJsonApiDocumentSchema } from "@libs/backend-shared";
import { SatelliteOwnerTypeSchema } from "#src/types.js";

export const SerializedAttachmentSchema = makeJsonApiDocumentSchema(
  "attachments",
  object({
    ownerType: SatelliteOwnerTypeSchema,
    ownerId: string(),
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
      ownerType: a.ownerType as z.infer<typeof SatelliteOwnerTypeSchema>,
      ownerId: a.ownerId,
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
