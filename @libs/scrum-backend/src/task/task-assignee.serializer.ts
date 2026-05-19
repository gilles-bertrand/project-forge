import type { TaskAssigneeEntityType } from "#src/task/task-assignee.entity.js";
import { object, string } from "zod";
import { z } from "zod";
import { makeJsonApiDocumentSchema } from "@libs/backend-shared";

export const SerializedTaskAssigneeSchema = makeJsonApiDocumentSchema(
  "task-assignees",
  object({
    taskId: string(),
    userId: string(),
    assignedAt: string(),
  }),
);

export function jsonApiSerializeTaskAssignee(
  a: TaskAssigneeEntityType,
): z.infer<typeof SerializedTaskAssigneeSchema> {
  return {
    id: a.id,
    type: "task-assignees" as const,
    attributes: {
      taskId: a.taskId,
      userId: a.userId,
      assignedAt: a.assignedAt.toISOString(),
    },
  };
}

export function jsonApiSerializeManyTaskAssignees(items: TaskAssigneeEntityType[]) {
  return items.map(jsonApiSerializeTaskAssignee);
}
