import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityRepository } from "@mikro-orm/core";
import { object, string } from "zod";
import {
  jsonApiSerializeSingleUserStoryDocument,
  SerializedUserStorySchema,
} from "#src/user-story/user-story.serializer.js";
import type { UserStoryEntityType } from "#src/user-story/user-story.entity.js";
import { jsonApiErrorDocumentSchema, makeJsonApiError, type Route } from "@libs/backend-shared";

export class GetUserStoryRoute implements Route {
  public constructor(private repository: EntityRepository<UserStoryEntityType>) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/:id",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            200: object({ data: SerializedUserStorySchema }),
            404: jsonApiErrorDocumentSchema,
          },
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const story = await this.repository.findOne({ id });
        if (!story) {
          return reply.code(404).send(
            makeJsonApiError(404, "Not Found", {
              code: "USER_STORY_NOT_FOUND",
              detail: `UserStory with id ${id} not found`,
            }),
          );
        }
        return reply.send(jsonApiSerializeSingleUserStoryDocument(story));
      },
    );
  }
}
