import type { FastifyInstanceTypeForModule } from "#src/init.js";
import { wrap, type EntityRepository } from "@mikro-orm/core";
import { number, object, string } from "zod";
import {
  jsonApiSerializeSingleUserStoryDocument,
  SerializedUserStorySchema,
} from "#src/user-story/user-story.serializer.js";
import type { UserStoryEntityType } from "#src/user-story/user-story.entity.js";
import {
  jsonApiErrorDocumentSchema,
  makeJsonApiError,
  makeSingleJsonApiTopDocument,
  type Route,
} from "@libs/backend-shared";
import { StoryStatusSchema } from "#src/types.js";

export class UpdateUserStoryRoute implements Route {
  public constructor(private repository: EntityRepository<UserStoryEntityType>) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.patch(
      "/:id",
      {
        schema: {
          params: object({ id: string() }),
          body: makeSingleJsonApiTopDocument(
            object({
              id: string().optional(),
              type: string().optional(),
              attributes: object({
                title: string().optional(),
                description: string().optional(),
                epicId: string().nullable().optional(),
                status: StoryStatusSchema.optional(),
                points: number().int().optional(),
                priority: number().int().optional(),
              }).partial(),
            }),
          ),
          response: {
            200: makeSingleJsonApiTopDocument(SerializedUserStorySchema),
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
        wrap(story).assign(request.body.data.attributes);
        await this.repository.getEntityManager().flush();
        return reply.send(jsonApiSerializeSingleUserStoryDocument(story));
      },
    );
  }
}
