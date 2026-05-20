import type { FastifyInstanceTypeForModule } from "#src/init.js";
import { TaskEntity } from "#src/task/task.entity.js";
import type { EntityManager } from "@mikro-orm/core";
import { array, number, object } from "zod";
import { jsonApiSerializeManyTasks, SerializedTaskSchema } from "#src/task/task.serializer.js";
import { parseListQuery } from "#src/utils/list-query.js";
import type { Route } from "@libs/backend-shared";

const ALLOWED_SORT_FIELDS = [
  "number",
  "title",
  "status",
  "priority",
  "points",
  "dueDate",
  "createdAt",
  "updatedAt",
];

export class ListTasksRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/",
      {
        schema: {
          response: {
            200: object({
              data: array(SerializedTaskSchema),
              meta: object({ total: number(), pages: number() }),
            }),
          },
        },
      },
      async (request, reply) => {
        const { where, orderBy, limit, offset, search } = parseListQuery(
          request.query as Record<string, unknown>,
          ALLOWED_SORT_FIELDS,
        );

        const finalWhere: Record<string, unknown> = { ...where };
        if (search) {
          finalWhere.$or = [
            { title: { $ilike: `%${search}%` } },
            { description: { $ilike: `%${search}%` } },
          ];
        }

        const [items, total] = await this.em
          .getRepository(TaskEntity)
          .findAndCount(finalWhere, { orderBy, offset, limit });

        return reply.send({
          data: jsonApiSerializeManyTasks(items),
          meta: { total, pages: Math.ceil(total / limit) },
        });
      },
    );
  }
}
