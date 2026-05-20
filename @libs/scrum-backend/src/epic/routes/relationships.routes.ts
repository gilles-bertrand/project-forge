import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityManager } from "@mikro-orm/core";
import { array, number, object, string } from "zod";
import { TaskEntity } from "#src/task/task.entity.js";
import { UserStoryEntity } from "#src/user-story/user-story.entity.js";
import { jsonApiSerializeManyTasks, SerializedTaskSchema } from "#src/task/task.serializer.js";
import {
  jsonApiSerializeManyUserStories,
  SerializedUserStorySchema,
} from "#src/user-story/user-story.serializer.js";
import { parseListQuery } from "#src/utils/list-query.js";
import type { Route } from "@libs/backend-shared";

export class ListEpicUserStoriesRoute implements Route {
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
          .findAndCount({ epicId: id }, { orderBy, offset, limit });
        return reply.send({
          data: jsonApiSerializeManyUserStories(items),
          meta: { total, pages: Math.ceil(total / limit) },
        });
      },
    );
  }
}

export class ListEpicTasksRoute implements Route {
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
          .findAndCount({ epicId: id }, { orderBy, offset, limit });
        return reply.send({
          data: jsonApiSerializeManyTasks(items),
          meta: { total, pages: Math.ceil(total / limit) },
        });
      },
    );
  }
}
