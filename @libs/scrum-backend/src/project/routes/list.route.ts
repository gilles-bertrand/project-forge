import type { FastifyInstanceTypeForModule } from "#src/init.js";
import { ProjectEntity } from "#src/project/project.entity.js";
import type { EntityManager } from "@mikro-orm/core";
import { array, number, object } from "zod";
import {
  jsonApiSerializeManyProjects,
  SerializedProjectSchema,
} from "#src/project/project.serializer.js";
import { parseListQuery } from "#src/helpers/list-query.js";
import type { Route } from "@libs/backend-shared";

const ALLOWED_SORT_FIELDS = ["name", "status", "createdAt", "updatedAt"];

export class ListProjectsRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/",
      {
        schema: {
          response: {
            200: object({
              data: array(SerializedProjectSchema),
              meta: object({
                total: number(),
                pages: number(),
              }),
            }),
          },
        },
      },
      async (request, reply) => {
        const queryParams = request.query as Record<string, unknown>;
        const { where, orderBy, limit, offset, search } = parseListQuery(
          queryParams,
          ALLOWED_SORT_FIELDS,
        );

        const finalWhere: Record<string, unknown> = { ...where };
        if (search) {
          finalWhere.$or = [
            { name: { $ilike: `%${search}%` } },
            { description: { $ilike: `%${search}%` } },
          ];
        }

        const repo = this.em.getRepository(ProjectEntity);
        const [projects, total] = await repo.findAndCount(finalWhere, {
          orderBy,
          offset,
          limit,
        });

        return reply.send({
          data: jsonApiSerializeManyProjects(projects),
          meta: {
            total,
            pages: Math.ceil(total / limit),
          },
        });
      },
    );
  }
}
