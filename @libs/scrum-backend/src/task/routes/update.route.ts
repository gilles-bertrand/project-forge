import type { FastifyInstanceTypeForModule } from "#src/init.js";
import { wrap, type EntityRepository } from "@mikro-orm/core";
import { number, object, string, z } from "zod";
import {
  jsonApiSerializeSingleTaskDocument,
  SerializedTaskSchema,
} from "#src/task/task.serializer.js";
import type { TaskEntityType } from "#src/task/task.entity.js";
import {
  jsonApiErrorDocumentSchema,
  makeJsonApiError,
  makeSingleJsonApiTopDocument,
  type Route,
} from "@libs/backend-shared";
import {
  TaskNatureSchema,
  TaskPrioritySchema,
  TaskStatusSchema,
  TaskTypeSchema,
} from "#src/types.js";

export class UpdateTaskRoute implements Route {
  public constructor(private repository: EntityRepository<TaskEntityType>) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.patch(
      "/:id",
      {
        schema: {
          params: object({ id: string() }),
          body: makeSingleJsonApiTopDocument(
            object({
              id: string().optional(),
              type: string().optional(),
              attributes: object({
                title: string().optional(),
                description: string().optional(),
                status: TaskStatusSchema.optional(),
                type: TaskTypeSchema.optional(),
                nature: TaskNatureSchema.optional(),
                priority: TaskPrioritySchema.optional(),
                points: number().int().optional(),
                estimatedHours: number().nullable().optional(),
                remainingHours: number().nullable().optional(),
                tags: z.array(string()).optional(),
                userStoryId: string().nullable().optional(),
                epicId: string().nullable().optional(),
                sprintId: string().nullable().optional(),
                dueDate: string().nullable().optional(),
              }).partial(),
            }),
          ),
          response: {
            200: makeSingleJsonApiTopDocument(SerializedTaskSchema),
            404: jsonApiErrorDocumentSchema,
          },
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const task = await this.repository.findOne({ id });
        if (!task) {
          return reply.code(404).send(
            makeJsonApiError(404, "Not Found", {
              code: "TASK_NOT_FOUND",
              detail: `Task with id ${id} not found`,
            }),
          );
        }

        const attrs = request.body.data.attributes;
        const update: Record<string, unknown> = { ...attrs };
        if (attrs.dueDate !== undefined)
          update.dueDate = attrs.dueDate ? new Date(attrs.dueDate) : null;
        if (attrs.status === "done" && attrs.remainingHours === undefined) {
          update.remainingHours = 0;
        }

        wrap(task).assign(update);
        await this.repository.getEntityManager().flush();
        return reply.send(jsonApiSerializeSingleTaskDocument(task));
      },
    );
  }
}
