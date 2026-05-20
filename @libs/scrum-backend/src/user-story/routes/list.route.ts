import type { FastifyInstanceTypeForModule } from "#src/init.js";
import { UserStoryEntity } from "#src/user-story/user-story.entity.js";
import type { EntityManager } from "@mikro-orm/core";
import { array, number, object } from "zod";
import {
  jsonApiSerializeManyUserStories,
  SerializedUserStorySchema,
} from "#src/user-story/user-story.serializer.js";
import { parseListQuery } from "#src/utils/list-query.js";
import type { Route } from "@libs/backend-shared";

const ALLOWED_SORT_FIELDS = ["title", "status", "priority", "points", "createdAt", "updatedAt"];

export class ListUserStoriesRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/",
      {
        schema: {
          response: {
            200: object({
              data: array(SerializedUserStorySchema),
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
          .getRepository(UserStoryEntity)
          .findAndCount(finalWhere, { orderBy, offset, limit });

        return reply.send({
          data: jsonApiSerializeManyUserStories(items),
          meta: { total, pages: Math.ceil(total / limit) },
        });
      },
    );
  }
}
