import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { TaskEntityType } from "#src/task/task.entity.js";
import type { EntityRepository } from "@mikro-orm/core";
import type { SqlEntityManager } from "@mikro-orm/postgresql";
import type { FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "crypto";
import {
  jsonApiSerializeSingleTaskDocument,
  SerializedTaskSchema,
} from "#src/task/task.serializer.js";
import { number, object, string, z } from "zod";
import { makeSingleJsonApiTopDocument, type Route } from "@libs/backend-shared";
import {
  TaskNatureSchema,
  TaskPrioritySchema,
  TaskStatusSchema,
  TaskTypeSchema,
} from "#src/types.js";
import { getNextTaskNumber } from "#src/utils/task-numbering.js";

const CreateTaskAttributesSchema = object({
  number: number().int().optional(),
  title: string(),
  description: string(),
  status: TaskStatusSchema,
  type: TaskTypeSchema,
  nature: TaskNatureSchema,
  priority: TaskPrioritySchema,
  points: number().int(),
  estimatedHours: number().nullable().optional(),
  projectId: string(),
  userStoryId: string().nullable().optional(),
  epicId: string().nullable().optional(),
  sprintId: string().nullable().optional(),
  createdById: string(),
  dueDate: string().nullable().optional(),
});

type CreateTaskBody = {
  data: {
    id?: string | null;
    attributes: z.infer<typeof CreateTaskAttributesSchema>;
  };
};

export class CreateTaskRoute implements Route {
  public constructor(
    private repository: EntityRepository<TaskEntityType>,
    private em: SqlEntityManager,
  ) {}

  private async handle(request: FastifyRequest<{ Body: CreateTaskBody }>, reply: FastifyReply) {
    const body = request.body.data.attributes;
    const number = body.number ?? (await getNextTaskNumber(this.em, body.projectId));

    const task = this.repository.create({
      id: request.body.data.id || randomUUID(),
      number,
      title: body.title,
      description: body.description,
      status: body.status,
      type: body.type,
      nature: body.nature,
      priority: body.priority,
      points: body.points,
      estimatedHours: body.estimatedHours ?? null,
      projectId: body.projectId,
      userStoryId: body.userStoryId ?? null,
      epicId: body.epicId ?? null,
      sprintId: body.sprintId ?? null,
      createdById: body.createdById,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    });
    await this.repository.getEntityManager().flush();
    return reply.send(jsonApiSerializeSingleTaskDocument(task));
  }

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.post(
      "/",
      {
        schema: {
          body: makeSingleJsonApiTopDocument(
            object({
              id: string().optional().nullable(),
              attributes: CreateTaskAttributesSchema,
            }),
          ),
          response: {
            200: makeSingleJsonApiTopDocument(SerializedTaskSchema),
          },
        },
      },
      (request, reply) => this.handle(request as never, reply),
    );
  }
}
