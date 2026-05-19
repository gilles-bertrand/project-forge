import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityManager } from "@mikro-orm/core";
import { array, number, object, string } from "zod";
import { TaskEntity } from "#src/task/task.entity.js";
import { jsonApiSerializeManyTasks, SerializedTaskSchema } from "#src/task/task.serializer.js";
import { parseListQuery } from "#src/helpers/list-query.js";
import type { Route } from "@libs/backend-shared";

export class ListUserStoryTasksRoute implements Route {
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
          .findAndCount({ userStoryId: id }, { orderBy, offset, limit });
        return reply.send({
          data: jsonApiSerializeManyTasks(items),
          meta: { total, pages: Math.ceil(total / limit) },
        });
      },
    );
  }
}
