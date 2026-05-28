import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const UserStoryEntity = defineEntity({
  name: "UserStory",
  tableName: "user_stories",
  properties: {
    id: p.string().primary(),
    title: p.string(),
    description: p.string(),
    notes: p.string().nullable(),
    color: p.string().nullable(),
    projectId: p.string().index(),
    epicId: p.string().nullable().index(),
    sprintId: p.string().nullable().index(),
    status: p.string(),
    points: p.integer().nullable(),
    priority: p.string().default("Moyenne"),
    rank: p.integer().default(0),
    value: p.integer().nullable(),
    createdById: p.string().nullable().index(),
    tags: p.array().default([]),
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .onUpdate(() => new Date())
      .onCreate(() => new Date()),
  },
});

export type UserStoryEntityType = InferEntity<typeof UserStoryEntity>;
