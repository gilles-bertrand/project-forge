import type { TaskEntityType } from "#src/task/task.entity.js";
import { number, object, string } from "zod";
import { z } from "zod";
import { makeJsonApiDocumentSchema } from "@libs/backend-shared";
import {
  TaskNatureSchema,
  TaskPrioritySchema,
  TaskStatusSchema,
  TaskTypeSchema,
} from "#src/types.js";

export const SerializedTaskSchema = makeJsonApiDocumentSchema(
  "tasks",
  object({
    number: number().int(),
    title: string(),
    description: string(),
    status: TaskStatusSchema,
    type: TaskTypeSchema,
    nature: TaskNatureSchema,
    priority: TaskPrioritySchema,
    points: number().int(),
    estimatedHours: number().nullable(),
    remainingHours: number().nullable(),
    tags: z.array(string()),
    projectId: string(),
    userStoryId: string().nullable(),
    epicId: string().nullable(),
    sprintId: string().nullable(),
    createdById: string(),
    dueDate: string().nullable(),
    createdAt: string(),
    updatedAt: string(),
  }),
);

export function jsonApiSerializeTask(t: TaskEntityType): z.infer<typeof SerializedTaskSchema> {
  return {
    id: t.id,
    type: "tasks" as const,
    attributes: {
      number: t.number,
      title: t.title,
      description: t.description,
      status: t.status as z.infer<typeof TaskStatusSchema>,
      type: t.type as z.infer<typeof TaskTypeSchema>,
      nature: t.nature as z.infer<typeof TaskNatureSchema>,
      priority: t.priority as z.infer<typeof TaskPrioritySchema>,
      points: t.points,
      estimatedHours: t.estimatedHours ?? null,
      remainingHours: t.remainingHours ?? null,
      tags: t.tags ?? [],
      projectId: t.projectId,
      userStoryId: t.userStoryId ?? null,
      epicId: t.epicId ?? null,
      sprintId: t.sprintId ?? null,
      createdById: t.createdById,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    },
  };
}

export function jsonApiSerializeManyTasks(tasks: TaskEntityType[]) {
  return tasks.map(jsonApiSerializeTask);
}

export function jsonApiSerializeSingleTaskDocument(t: TaskEntityType) {
  return { data: jsonApiSerializeTask(t) };
}
