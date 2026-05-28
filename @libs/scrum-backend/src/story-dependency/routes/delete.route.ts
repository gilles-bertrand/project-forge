import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityRepository } from "@mikro-orm/core";
import { literal, object, string } from "zod";
import type { StoryDependencyEntityType } from "#src/story-dependency/story-dependency.entity.js";
import {
  jsonApiErrorDocumentSchema,
  makeJsonApiError,
  makeSingleJsonApiTopDocument,
  type Route,
} from "@libs/backend-shared";

export class DeleteStoryDependencyRoute implements Route {
  public constructor(private repository: EntityRepository<StoryDependencyEntityType>) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.delete(
      "/:id",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            204: makeSingleJsonApiTopDocument(literal(null)),
            404: jsonApiErrorDocumentSchema,
          },
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const dep = await this.repository.findOne({ id });
        if (!dep) {
          return reply.code(404).send(
            makeJsonApiError(404, "Not Found", {
              code: "STORY_DEPENDENCY_NOT_FOUND",
              detail: `Story dependency with id ${id} not found`,
            }),
          );
        }
        await this.repository.getEntityManager().remove(dep).flush();
        return reply.code(204).send({ data: null });
      },
    );
  }
}
