import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const UserStoryEntity = defineEntity({
  name: "UserStory",
  tableName: "user_stories",
  properties: {
    id: p.string().primary(),
    title: p.string(),
    description: p.string(),
    projectId: p.string().index(),
    epicId: p.string().nullable().index(),
    status: p.string(),
    points: p.integer(),
    priority: p.integer(),
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .onUpdate(() => new Date())
      .onCreate(() => new Date()),
  },
});

export type UserStoryEntityType = InferEntity<typeof UserStoryEntity>;
