import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityManager } from "@mikro-orm/core";
import { array, number, object, string } from "zod";
import { EpicEntity } from "#src/epic/epic.entity.js";
import { SprintEntity } from "#src/sprint/sprint.entity.js";
import { TaskEntity } from "#src/task/task.entity.js";
import { UserStoryEntity } from "#src/user-story/user-story.entity.js";
import { jsonApiSerializeManyEpics, SerializedEpicSchema } from "#src/epic/epic.serializer.js";
import {
  jsonApiSerializeManySprints,
  SerializedSprintSchema,
} from "#src/sprint/sprint.serializer.js";
import { jsonApiSerializeManyTasks, SerializedTaskSchema } from "#src/task/task.serializer.js";
import {
  jsonApiSerializeManyUserStories,
  SerializedUserStorySchema,
} from "#src/user-story/user-story.serializer.js";
import { parseListQuery } from "#src/helpers/list-query.js";
import type { Route } from "@libs/backend-shared";

export class ListProjectTasksRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/:id/tasks",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            200: object({
              data: array(SerializedTaskSchema),
              meta: object({ total: number(), pages: number() }),
            }),
          },
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const { orderBy, limit, offset } = parseListQuery(
          request.query as Record<string, unknown>,
          ["number", "priority", "status", "createdAt"],
        );
        const [items, total] = await this.em
          .getRepository(TaskEntity)
          .findAndCount({ projectId: id }, { orderBy, offset, limit });
        return reply.send({
          data: jsonApiSerializeManyTasks(items),
          meta: { total, pages: Math.ceil(total / limit) },
        });
      },
    );
  }
}

export class ListProjectSprintsRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/:id/sprints",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            200: object({
              data: array(SerializedSprintSchema),
              meta: object({ total: number(), pages: number() }),
            }),
          },
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const { orderBy, limit, offset } = parseListQuery(
          request.query as Record<string, unknown>,
          ["startDate", "endDate", "createdAt", "status"],
        );
        const [items, total] = await this.em
          .getRepository(SprintEntity)
          .findAndCount({ projectId: id }, { orderBy, offset, limit });
        return reply.send({
          data: jsonApiSerializeManySprints(items),
          meta: { total, pages: Math.ceil(total / limit) },
        });
      },
    );
  }
}

export class ListProjectEpicsRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/:id/epics",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            200: object({
              data: array(SerializedEpicSchema),
              meta: object({ total: number(), pages: number() }),
            }),
          },
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const { orderBy, limit, offset } = parseListQuery(
          request.query as Record<string, unknown>,
          ["title", "status", "createdAt"],
        );
        const [items, total] = await this.em
          .getRepository(EpicEntity)
          .findAndCount({ projectId: id }, { orderBy, offset, limit });
        return reply.send({
          data: jsonApiSerializeManyEpics(items),
          meta: { total, pages: Math.ceil(total / limit) },
        });
      },
    );
  }
}

export class ListProjectUserStoriesRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/:id/user-stories",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            200: object({
              data: array(SerializedUserStorySchema),
              meta: object({ total: number(), pages: number() }),
            }),
          },
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const { orderBy, limit, offset } = parseListQuery(
          request.query as Record<string, unknown>,
          ["title", "status", "priority", "createdAt"],
        );
        const [items, total] = await this.em
          .getRepository(UserStoryEntity)
          .findAndCount({ projectId: id }, { orderBy, offset, limit });
        return reply.send({
          data: jsonApiSerializeManyUserStories(items),
          meta: { total, pages: Math.ceil(total / limit) },
        });
      },
    );
  }
}
