import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityManager } from "@mikro-orm/core";
import { array, number, object, string } from "zod";
import { StoryDependencyEntity } from "#src/story-dependency/story-dependency.entity.js";
import { UserStoryEntity } from "#src/user-story/user-story.entity.js";
import {
  jsonApiSerializeManyStoryDependencies,
  SerializedStoryDependencySchema,
} from "#src/story-dependency/story-dependency.serializer.js";
import { jsonApiErrorDocumentSchema, makeJsonApiError, type Route } from "@libs/backend-shared";

export class ListByStoryDependenciesRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/:id/dependencies",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            200: object({
              data: object({
                outgoing: array(SerializedStoryDependencySchema),
                incoming: array(SerializedStoryDependencySchema),
              }),
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

        const repo = this.em.getRepository(StoryDependencyEntity);
        const [outgoing, incoming] = await Promise.all([
          repo.findAll({ where: { fromStoryId: id }, orderBy: { createdAt: "ASC" } }),
          repo.findAll({ where: { toStoryId: id }, orderBy: { createdAt: "ASC" } }),
        ]);

        return reply.send({
          data: {
            outgoing: jsonApiSerializeManyStoryDependencies(outgoing),
            incoming: jsonApiSerializeManyStoryDependencies(incoming),
          },
          meta: { total: outgoing.length + incoming.length },
        });
      },
    );
  }
}
