import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityManager } from "@mikro-orm/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import { array, literal, number, object, string } from "zod";
import { randomUUID } from "crypto";
import { TaskEntity } from "#src/task/task.entity.js";
import { TaskAssigneeEntity } from "#src/task/task-assignee.entity.js";
import { ProjectMemberEntity } from "#src/project/project-member.entity.js";
import {
  jsonApiSerializeManyTaskAssignees,
  jsonApiSerializeTaskAssignee,
  SerializedTaskAssigneeSchema,
} from "#src/task/task-assignee.serializer.js";
import {
  jsonApiErrorDocumentSchema,
  makeJsonApiError,
  makeSingleJsonApiTopDocument,
  type Route,
} from "@libs/backend-shared";

export class ListTaskAssigneesRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/:id/assignees",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            200: object({
              data: array(SerializedTaskAssigneeSchema),
              meta: object({ total: number() }),
            }),
            404: jsonApiErrorDocumentSchema,
          },
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const task = await this.em.findOne(TaskEntity, { id });
        if (!task) {
          return reply.code(404).send(
            makeJsonApiError(404, "Not Found", {
              code: "TASK_NOT_FOUND",
              detail: `Task with id ${id} not found`,
            }),
          );
        }
        const items = await this.em
          .getRepository(TaskAssigneeEntity)
          .findAll({ where: { taskId: id } });
        return reply.send({
          data: jsonApiSerializeManyTaskAssignees(items),
          meta: { total: items.length },
        });
      },
    );
  }
}

export class AddTaskAssigneeRoute implements Route {
  public constructor(private em: EntityManager) {}

  private async handle(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { data: { attributes: { userId: string } } };
    }>,
    reply: FastifyReply,
  ) {
    const { id } = request.params;
    const task = await this.em.findOne(TaskEntity, { id });
    if (!task) {
      return reply.code(404).send(
        makeJsonApiError(404, "Not Found", {
          code: "TASK_NOT_FOUND",
          detail: `Task with id ${id} not found`,
        }),
      );
    }

    const { userId } = request.body.data.attributes;

    // L'assigné doit être membre du projet de la task (cohérence sprint/US/membres).
    const membership = await this.em.findOne(ProjectMemberEntity, {
      projectId: task.projectId,
      userId,
    });
    if (!membership) {
      return reply.code(422).send(
        makeJsonApiError(422, "Unprocessable Entity", {
          code: "USER_NOT_PROJECT_MEMBER",
          detail: `User ${userId} is not a member of project ${task.projectId}`,
        }),
      );
    }

    const repo = this.em.getRepository(TaskAssigneeEntity);
    const existing = await repo.findOne({ taskId: id, userId });
    if (existing) {
      return reply.code(409).send(
        makeJsonApiError(409, "Conflict", {
          code: "ASSIGNEE_ALREADY_EXISTS",
          detail: `User ${userId} is already assigned to task ${id}`,
        }),
      );
    }

    const item = repo.create({ id: randomUUID(), taskId: id, userId });
    await this.em.flush();
    return reply.send({ data: jsonApiSerializeTaskAssignee(item) });
  }

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.post(
      "/:id/assignees",
      {
        schema: {
          params: object({ id: string() }),
          body: makeSingleJsonApiTopDocument(
            object({
              attributes: object({ userId: string() }),
            }),
          ),
          response: {
            200: makeSingleJsonApiTopDocument(SerializedTaskAssigneeSchema),
            404: jsonApiErrorDocumentSchema,
            409: jsonApiErrorDocumentSchema,
            422: jsonApiErrorDocumentSchema,
          },
        },
      },
      (request, reply) => this.handle(request as never, reply),
    );
  }
}

export class RemoveTaskAssigneeRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.delete(
      "/:id/assignees/:userId",
      {
        schema: {
          params: object({ id: string(), userId: string() }),
          response: {
            204: makeSingleJsonApiTopDocument(literal(null)),
            404: jsonApiErrorDocumentSchema,
          },
        },
      },
      async (request, reply) => {
        const { id, userId } = request.params as { id: string; userId: string };
        const item = await this.em
          .getRepository(TaskAssigneeEntity)
          .findOne({ taskId: id, userId });
        if (!item) {
          return reply.code(404).send(
            makeJsonApiError(404, "Not Found", {
              code: "ASSIGNEE_NOT_FOUND",
              detail: `User ${userId} is not assigned to task ${id}`,
            }),
          );
        }
        await this.em.remove(item).flush();
        return reply.code(204).send({ data: null });
      },
    );
  }
}
