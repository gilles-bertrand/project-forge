import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityManager } from "@mikro-orm/core";
import { array, number, object, string } from "zod";
import { AcceptanceTestEntity } from "#src/acceptance-test/acceptance-test.entity.js";
import { UserStoryEntity } from "#src/user-story/user-story.entity.js";
import {
  jsonApiSerializeManyAcceptanceTests,
  SerializedAcceptanceTestSchema,
} from "#src/acceptance-test/acceptance-test.serializer.js";
import { jsonApiErrorDocumentSchema, makeJsonApiError, type Route } from "@libs/backend-shared";

export class ListByStoryAcceptanceTestRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/:id/acceptance-tests",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            200: object({
              data: array(SerializedAcceptanceTestSchema),
              meta: object({ total: number() }),
            }),
            404: jsonApiErrorDocumentSchema,
          },
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const story = await this.em.findOne(UserStoryEntity, { id });
        if (!story) {
          return reply.code(404).send(
            makeJsonApiError(404, "Not Found", {
              code: "USER_STORY_NOT_FOUND",
              detail: `User story with id ${id} not found`,
            }),
          );
        }
        const items = await this.em.getRepository(AcceptanceTestEntity).findAll({
          where: { userStoryId: id },
          orderBy: { rank: "ASC" },
        });
        return reply.send({
          data: jsonApiSerializeManyAcceptanceTests(items),
          meta: { total: items.length },
        });
      },
    );
  }
}
