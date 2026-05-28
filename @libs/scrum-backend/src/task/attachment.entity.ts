import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const AttachmentEntity = defineEntity({
  name: "Attachment",
  tableName: "attachments",
  properties: {
    id: p.string().primary(),
    ownerType: p.string(),
    ownerId: p.string().index(),
    name: p.string(),
    url: p.string(),
    mimeType: p.string(),
    sizeBytes: p.integer(),
    uploadedById: p.string().index(),
    createdAt: p.datetime().onCreate(() => new Date()),
  },
});

export type AttachmentEntityType = InferEntity<typeof AttachmentEntity>;
