import type { UserStoryEntityType } from "#src/user-story/user-story.entity.js";
import { number, object, string } from "zod";
import { z } from "zod";
import { makeJsonApiDocumentSchema } from "@libs/backend-shared";
import { StoryStatusSchema } from "#src/types.js";

export const SerializedUserStorySchema = makeJsonApiDocumentSchema(
  "user-stories",
  object({
    title: string(),
    description: string(),
    projectId: string(),
    epicId: string().nullable(),
    status: StoryStatusSchema,
    points: number().int(),
    priority: number().int(),
    createdAt: string(),
    updatedAt: string(),
  }),
);

export function jsonApiSerializeUserStory(
  s: UserStoryEntityType,
): z.infer<typeof SerializedUserStorySchema> {
  return {
    id: s.id,
    type: "user-stories" as const,
    attributes: {
      title: s.title,
      description: s.description,
      projectId: s.projectId,
      epicId: s.epicId ?? null,
      status: s.status as z.infer<typeof StoryStatusSchema>,
      points: s.points,
      priority: s.priority,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    },
  };
}

export function jsonApiSerializeManyUserStories(stories: UserStoryEntityType[]) {
  return stories.map(jsonApiSerializeUserStory);
}

export function jsonApiSerializeSingleUserStoryDocument(s: UserStoryEntityType) {
  return { data: jsonApiSerializeUserStory(s) };
}
