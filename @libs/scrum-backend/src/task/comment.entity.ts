import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const CommentEntity = defineEntity({
  name: "Comment",
  tableName: "comments",
  properties: {
    id: p.string().primary(),
    ownerType: p.string(),
    ownerId: p.string().index(),
    userId: p.string().index(),
    content: p.string(),
    type: p.string(),
    metadata: p.json().nullable(),
    createdAt: p.datetime().onCreate(() => new Date()),
  },
});

export type CommentEntityType = InferEntity<typeof CommentEntity>;
