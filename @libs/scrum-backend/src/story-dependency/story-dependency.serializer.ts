import type { StoryDependencyEntityType } from "#src/story-dependency/story-dependency.entity.js";
import { object, string } from "zod";
import { z } from "zod";
import { makeJsonApiDocumentSchema } from "@libs/backend-shared";
import { StoryDependencyTypeSchema } from "#src/types.js";

export const SerializedStoryDependencySchema = makeJsonApiDocumentSchema(
  "story-dependencies",
  object({
    fromStoryId: string(),
    toStoryId: string(),
    type: StoryDependencyTypeSchema,
    createdAt: string(),
  }),
);

export function jsonApiSerializeStoryDependency(
  d: StoryDependencyEntityType,
): z.infer<typeof SerializedStoryDependencySchema> {
  return {
    id: d.id,
    type: "story-dependencies" as const,
    attributes: {
      fromStoryId: d.fromStoryId,
      toStoryId: d.toStoryId,
      type: d.type as z.infer<typeof StoryDependencyTypeSchema>,
      createdAt: d.createdAt.toISOString(),
    },
  };
}

export function jsonApiSerializeManyStoryDependencies(items: StoryDependencyEntityType[]) {
  return items.map(jsonApiSerializeStoryDependency);
}

export function jsonApiSerializeSingleStoryDependencyDocument(d: StoryDependencyEntityType) {
  return { data: jsonApiSerializeStoryDependency(d) };
}
