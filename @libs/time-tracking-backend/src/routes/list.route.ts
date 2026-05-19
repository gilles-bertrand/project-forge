import type { FastifyInstanceTypeForModule } from "#src/init.js";
import { TimeEntryEntity } from "#src/entities/time-entry.entity.js";
import { raw, type EntityManager } from "@mikro-orm/core";
import type { SqlEntityManager } from "@mikro-orm/postgresql";
import { array, number, object } from "zod";
import {
  jsonApiSerializeManyTimeEntries,
  SerializedTimeEntrySchema,
} from "#src/serializers/time-entry.serializer.js";
import { parseListQuery } from "#src/helpers/list-query.js";
import type { Route } from "@libs/backend-shared";

const ALLOWED_SORT_FIELDS = ["date", "hours", "createdAt"];

async function computeTotalHours(
  em: SqlEntityManager,
  where: Record<string, unknown>,
): Promise<number> {
  const result = (await em
    .createQueryBuilder(TimeEntryEntity)
    .select(raw("COALESCE(SUM(hours), 0) as total"))
    .where(where)
    .execute("get")) as { total: string | number | null } | null;
  return Number(result?.total ?? 0);
}

export class ListTimeEntriesRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/",
      {
        schema: {
          response: {
            200: object({
              data: array(SerializedTimeEntrySchema),
              meta: object({
                total: number(),
                pages: number(),
                totalHours: number(),
              }),
            }),
          },
        },
      },
      async (request, reply) => {
        const { where, orderBy, limit, offset } = parseListQuery(
          request.query as Record<string, unknown>,
          ALLOWED_SORT_FIELDS,
        );

        const finalOrderBy =
          Object.keys(orderBy).length === 0 ? { date: "DESC" as const } : orderBy;

        const [items, total] = await this.em
          .getRepository(TimeEntryEntity)
          .findAndCount(where, { orderBy: finalOrderBy, offset, limit });

        const totalHours = await computeTotalHours(this.em as SqlEntityManager, where);

        return reply.send({
          data: jsonApiSerializeManyTimeEntries(items),
          meta: {
            total,
            pages: Math.ceil(total / limit),
            totalHours,
          },
        });
      },
    );
  }
}
