import type { FastifyInstanceTypeForModule } from "#src/init.js";
import { EpicEntity } from "#src/epic/epic.entity.js";
import type { EntityManager } from "@mikro-orm/core";
import { array, number, object } from "zod";
import { jsonApiSerializeManyEpics, SerializedEpicSchema } from "#src/epic/epic.serializer.js";
import { parseListQuery } from "#src/utils/list-query.js";
import type { Route } from "@libs/backend-shared";

const ALLOWED_SORT_FIELDS = ["title", "status", "createdAt", "updatedAt"];

export class ListEpicsRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/",
      {
        schema: {
          response: {
            200: object({
              data: array(SerializedEpicSchema),
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
          .getRepository(EpicEntity)
          .findAndCount(finalWhere, { orderBy, offset, limit });

        return reply.send({
          data: jsonApiSerializeManyEpics(items),
          meta: { total, pages: Math.ceil(total / limit) },
        });
      },
    );
  }
}
