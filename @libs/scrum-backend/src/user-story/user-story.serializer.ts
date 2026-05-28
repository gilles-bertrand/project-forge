import type { UserStoryEntityType } from "#src/user-story/user-story.entity.js";
import { array, number, object, string } from "zod";
import { z } from "zod";
import { makeJsonApiDocumentSchema } from "@libs/backend-shared";
import { StoryPrioritySchema, StoryStatusSchema } from "#src/types.js";

export const SerializedUserStorySchema = makeJsonApiDocumentSchema(
  "user-stories",
  object({
    title: string(),
    description: string(),
    notes: string().nullable(),
    color: string().nullable(),
    projectId: string(),
    epicId: string().nullable(),
    sprintId: string().nullable(),
    status: StoryStatusSchema,
    points: number().int().nullable(),
    priority: StoryPrioritySchema,
    rank: number().int(),
    value: number().int().nullable(),
    createdById: string().nullable(),
    tags: array(string()),
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
      notes: s.notes ?? null,
      color: s.color ?? null,
      projectId: s.projectId,
      epicId: s.epicId ?? null,
      sprintId: s.sprintId ?? null,
      status: s.status as z.infer<typeof StoryStatusSchema>,
      points: s.points ?? null,
      priority: s.priority as z.infer<typeof StoryPrioritySchema>,
      rank: s.rank,
      value: s.value ?? null,
      createdById: s.createdById ?? null,
      tags: (s.tags ?? []) as string[],
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
