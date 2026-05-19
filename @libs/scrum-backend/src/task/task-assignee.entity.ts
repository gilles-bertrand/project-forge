import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const TaskAssigneeEntity = defineEntity({
  name: "TaskAssignee",
  tableName: "task_assignees",
  properties: {
    id: p.string().primary(),
    taskId: p.string().index(),
    userId: p.string().index(),
    assignedAt: p.datetime().onCreate(() => new Date()),
  },
});

export type TaskAssigneeEntityType = InferEntity<typeof TaskAssigneeEntity>;
