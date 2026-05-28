import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const StoryDependencyEntity = defineEntity({
  name: "StoryDependency",
  tableName: "story_dependencies",
  properties: {
    id: p.string().primary(),
    fromStoryId: p.string().index(),
    toStoryId: p.string().index(),
    type: p.string().default("blocks"),
    createdAt: p.datetime().onCreate(() => new Date()),
  },
});

export type StoryDependencyEntityType = InferEntity<typeof StoryDependencyEntity>;
