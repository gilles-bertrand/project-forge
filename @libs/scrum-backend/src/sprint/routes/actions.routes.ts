import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityManager } from "@mikro-orm/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import { object, string } from "zod";
import {
  jsonApiSerializeSingleSprintDocument,
  SerializedSprintSchema,
} from "#src/sprint/sprint.serializer.js";
import { SprintEntity } from "#src/sprint/sprint.entity.js";
import { TaskEntity } from "#src/task/task.entity.js";
import { UserStoryEntity } from "#src/user-story/user-story.entity.js";
import {
  jsonApiErrorDocumentSchema,
  makeJsonApiError,
  makeSingleJsonApiTopDocument,
  type Route,
} from "@libs/backend-shared";

export class StartSprintRoute implements Route {
  public constructor(private em: EntityManager) {}

  private async handle(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = request.params;
    const sprint = await this.em.findOne(SprintEntity, { id });
    if (!sprint) {
      return reply.code(404).send(
        makeJsonApiError(404, "Not Found", {
          code: "SPRINT_NOT_FOUND",
          detail: `Sprint with id ${id} not found`,
        }),
      );
    }

    if (sprint.status !== "planned") {
      return reply.code(409).send(
        makeJsonApiError(409, "Conflict", {
          code: "SPRINT_NOT_PLANNED",
          detail: `Sprint must be 'planned' to start (current: ${sprint.status})`,
        }),
      );
    }

    const activeCount = await this.em.count(SprintEntity, {
      projectId: sprint.projectId,
      status: "active",
    });
    if (activeCount > 0) {
      return reply.code(409).send(
        makeJsonApiError(409, "Conflict", {
          code: "ACTIVE_SPRINT_EXISTS",
          detail: `Project ${sprint.projectId} already has an active sprint`,
        }),
      );
    }

    sprint.status = "active";
    await this.em.flush();
    return reply.send(jsonApiSerializeSingleSprintDocument(sprint));
  }

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.post(
      "/:id/start",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            200: makeSingleJsonApiTopDocument(SerializedSprintSchema),
            404: jsonApiErrorDocumentSchema,
            409: jsonApiErrorDocumentSchema,
          },
        },
      },
      (request, reply) => this.handle(request as never, reply),
    );
  }
}

async function recomputeCompletedPoints(em: EntityManager, sprintId: string): Promise<number> {
  const tasks = await em.find(TaskEntity, { sprintId });
  const storyIds = Array.from(
    new Set(tasks.map((t) => t.userStoryId).filter((v): v is string => v !== null)),
  );
  if (storyIds.length === 0) return 0;
  const stories = await em.find(UserStoryEntity, { id: { $in: storyIds }, status: "done" });
  return stories.reduce((acc, s) => acc + s.points, 0);
}

export class StopSprintRoute implements Route {
  public constructor(private em: EntityManager) {}

  private async handle(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = request.params;
    const sprint = await this.em.findOne(SprintEntity, { id });
    if (!sprint) {
      return reply.code(404).send(
        makeJsonApiError(404, "Not Found", {
          code: "SPRINT_NOT_FOUND",
          detail: `Sprint with id ${id} not found`,
        }),
      );
    }

    if (sprint.status !== "active") {
      return reply.code(409).send(
        makeJsonApiError(409, "Conflict", {
          code: "SPRINT_NOT_ACTIVE",
          detail: `Sprint must be 'active' to stop (current: ${sprint.status})`,
        }),
      );
    }

    sprint.status = "completed";
    sprint.completedPoints = await recomputeCompletedPoints(this.em, id);
    await this.em.flush();
    return reply.send(jsonApiSerializeSingleSprintDocument(sprint));
  }

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.post(
      "/:id/stop",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            200: makeSingleJsonApiTopDocument(SerializedSprintSchema),
            404: jsonApiErrorDocumentSchema,
            409: jsonApiErrorDocumentSchema,
          },
        },
      },
      (request, reply) => this.handle(request as never, reply),
    );
  }
}
