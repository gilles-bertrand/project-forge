import type { CommentEntityType } from "#src/task/comment.entity.js";
import { object, record, string, unknown } from "zod";
import { z } from "zod";
import { makeJsonApiDocumentSchema } from "@libs/backend-shared";
import { CommentTypeSchema, SatelliteOwnerTypeSchema } from "#src/types.js";

export const SerializedCommentSchema = makeJsonApiDocumentSchema(
  "comments",
  object({
    ownerType: SatelliteOwnerTypeSchema,
    ownerId: string(),
    userId: string(),
    content: string(),
    type: CommentTypeSchema,
    metadata: record(string(), unknown()).nullable(),
    createdAt: string(),
  }),
);

export function jsonApiSerializeComment(
  c: CommentEntityType,
): z.infer<typeof SerializedCommentSchema> {
  return {
    id: c.id,
    type: "comments" as const,
    attributes: {
      ownerType: c.ownerType as z.infer<typeof SatelliteOwnerTypeSchema>,
      ownerId: c.ownerId,
      userId: c.userId,
      content: c.content,
      type: c.type as z.infer<typeof CommentTypeSchema>,
      metadata: (c.metadata as Record<string, unknown> | null) ?? null,
      createdAt: c.createdAt.toISOString(),
    },
  };
}

export function jsonApiSerializeManyComments(comments: CommentEntityType[]) {
  return comments.map(jsonApiSerializeComment);
}
