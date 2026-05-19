import type { FastifyInstanceTypeForModule } from "#src/init.js";
import { SprintEntity } from "#src/sprint/sprint.entity.js";
import type { EntityManager } from "@mikro-orm/core";
import { array, number, object } from "zod";
import {
  jsonApiSerializeManySprints,
  SerializedSprintSchema,
} from "#src/sprint/sprint.serializer.js";
import { parseListQuery } from "#src/helpers/list-query.js";
import type { Route } from "@libs/backend-shared";

const ALLOWED_SORT_FIELDS = ["name", "status", "startDate", "endDate", "createdAt"];

export class ListSprintsRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/",
      {
        schema: {
          response: {
            200: object({
              data: array(SerializedSprintSchema),
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
            { name: { $ilike: `%${search}%` } },
            { goal: { $ilike: `%${search}%` } },
          ];
        }

        const [items, total] = await this.em
          .getRepository(SprintEntity)
          .findAndCount(finalWhere, { orderBy, offset, limit });

        return reply.send({
          data: jsonApiSerializeManySprints(items),
          meta: { total, pages: Math.ceil(total / limit) },
        });
      },
    );
  }
}
