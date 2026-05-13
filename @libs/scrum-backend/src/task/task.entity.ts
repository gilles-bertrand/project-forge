import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const TaskEntity = defineEntity({
  name: "Task",
  tableName: "tasks",
  properties: {
    id: p.string().primary(),
    number: p.integer().index(),
    title: p.string(),
    description: p.string(),
    status: p.string(),
    type: p.string(),
    nature: p.string(),
    priority: p.string(),
    points: p.integer(),
    estimatedHours: p.float().nullable(),
    projectId: p.string().index(),
    userStoryId: p.string().nullable().index(),
    epicId: p.string().nullable().index(),
    sprintId: p.string().nullable().index(),
    createdById: p.string().index(),
    dueDate: p.datetime().nullable(),
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .onUpdate(() => new Date())
      .onCreate(() => new Date()),
  },
});

export type TaskEntityType = InferEntity<typeof TaskEntity>;
