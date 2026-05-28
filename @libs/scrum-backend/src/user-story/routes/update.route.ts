import type { FastifyInstanceTypeForModule } from "#src/init.js";
import { wrap, type EntityRepository } from "@mikro-orm/core";
import { array, number, object, string } from "zod";
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
import { StoryPrioritySchema, StoryStatusSchema, type StoryStatus } from "#src/types.js";
import { assertStoryTransition, InvalidStoryTransitionError } from "#src/user-story/transitions.js";

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
                points: number().int().nullable().optional(),
                priority: StoryPrioritySchema.optional(),
                notes: string().nullable().optional(),
                color: string().nullable().optional(),
                rank: number().int().optional(),
                value: number().int().nullable().optional(),
                createdById: string().nullable().optional(),
                tags: array(string()).optional(),
              }).partial(),
            }),
          ),
          response: {
            200: makeSingleJsonApiTopDocument(SerializedUserStorySchema),
            404: jsonApiErrorDocumentSchema,
            422: jsonApiErrorDocumentSchema,
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
        const attrs = request.body.data.attributes;
        if (attrs.status !== undefined) {
          try {
            assertStoryTransition(story.status as StoryStatus, attrs.status);
          } catch (error) {
            if (error instanceof InvalidStoryTransitionError) {
              return reply.code(422).send(
                makeJsonApiError(422, "Invalid Story Transition", {
                  code: "INVALID_STORY_TRANSITION",
                  detail: error.message,
                }),
              );
            }
            throw error;
          }
        }
        wrap(story).assign(attrs);
        await this.repository.getEntityManager().flush();
        return reply.send(jsonApiSerializeSingleUserStoryDocument(story));
      },
    );
  }
}
