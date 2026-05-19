import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const SprintEntity = defineEntity({
  name: "Sprint",
  tableName: "sprints",
  properties: {
    id: p.string().primary(),
    name: p.string(),
    goal: p.string().nullable(),
    projectId: p.string().index(),
    startDate: p.datetime(),
    endDate: p.datetime(),
    status: p.string(),
    velocityPoints: p.integer().default(0),
    completedPoints: p.integer().default(0),
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .onUpdate(() => new Date())
      .onCreate(() => new Date()),
  },
});

export type SprintEntityType = InferEntity<typeof SprintEntity>;
