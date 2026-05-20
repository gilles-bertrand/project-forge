import type { FastifyInstanceTypeForModule } from "#src/init.js";
import { UserEntity } from "#src/entities/user.entity.js";
import type { EntityManager } from "@mikro-orm/core";
import { array, number, object, string } from "zod";
import {
  jsonApiSerializeManyUsers,
  SerializedUserSchema,
} from "#src/serializers/user.serializer.js";
import type { Route } from "@libs/backend-shared";

export class ListRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/",
      {
        schema: {
          querystring: object({
            "filter[search]": string().optional(),
            sort: string().optional(),
          }),
          response: {
            200: object({
              data: array(SerializedUserSchema),
              meta: object({
                total: number(),
              }),
            }),
          },
        },
      },
      async (request, reply) => {
        const searchQuery = request.query["filter[search]"];
        const sortParam = request.query.sort;

        const where: Record<string, unknown> = {};

        if (searchQuery) {
          where.$or = [
            { firstName: { $like: `%${searchQuery}%` } },
            { lastName: { $like: `%${searchQuery}%` } },
            { email: { $like: `%${searchQuery}%` } },
          ];
        }

        let orderBy: Record<string, string> = {};
        if (sortParam) {
          const isDescending = sortParam.startsWith("-");
          const field = isDescending ? sortParam.slice(1) : sortParam;

          if (["firstName", "lastName", "email"].includes(field)) {
            orderBy = { [field]: isDescending ? "DESC" : "ASC" };
          }
        }

        const userRepository = this.em.getRepository(UserEntity);
        const [users, total] = await userRepository.findAndCount(where, { orderBy });

        return reply.send({
          data: jsonApiSerializeManyUsers(users),
          meta: {
            total,
          },
        });
      },
    );
  }
}
