import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityManager } from "@mikro-orm/core";
import { object, string } from "zod";
import {
  jsonApiSerializeSingleStoryDependencyDocument,
  SerializedStoryDependencySchema,
} from "#src/story-dependency/story-dependency.serializer.js";
import {
  jsonApiErrorDocumentSchema,
  makeJsonApiError,
  makeSingleJsonApiTopDocument,
  type Route,
} from "@libs/backend-shared";
import { StoryDependencyTypeSchema } from "#src/types.js";
import {
  CrossProjectDependencyError,
  CycleDetectedError,
  DuplicateDependencyError,
  SelfDependencyError,
  StoryDependencyService,
  StoryNotFoundError,
} from "#src/story-dependency/story-dependency.service.js";

export class CreateOnStoryDependencyRoute implements Route {
  public constructor(
    private em: EntityManager,
    private service: StoryDependencyService = new StoryDependencyService(),
  ) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.post(
      "/:id/dependencies",
      {
        schema: {
          params: object({ id: string() }),
          body: makeSingleJsonApiTopDocument(
            object({
              attributes: object({
                toStoryId: string(),
                type: StoryDependencyTypeSchema.optional().default("blocks"),
              }),
            }),
          ),
          response: {
            200: makeSingleJsonApiTopDocument(SerializedStoryDependencySchema),
            404: jsonApiErrorDocumentSchema,
            422: jsonApiErrorDocumentSchema,
          },
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const attrs = request.body.data.attributes;
        try {
          const dep = await this.service.create(this.em, id, attrs.toStoryId, attrs.type);
          return reply.send(jsonApiSerializeSingleStoryDependencyDocument(dep));
        } catch (error) {
          if (error instanceof StoryNotFoundError) {
            return reply.code(404).send(
              makeJsonApiError(404, "Not Found", {
                code: "USER_STORY_NOT_FOUND",
                detail: error.message,
              }),
            );
          }
          if (error instanceof SelfDependencyError) {
            return reply.code(422).send(
              makeJsonApiError(422, "Unprocessable Entity", {
                code: "SELF_DEPENDENCY",
                detail: error.message,
              }),
            );
          }
          if (error instanceof CrossProjectDependencyError) {
            return reply.code(422).send(
              makeJsonApiError(422, "Unprocessable Entity", {
                code: "CROSS_PROJECT_DEPENDENCY",
                detail: error.message,
              }),
            );
          }
          if (error instanceof DuplicateDependencyError) {
            return reply.code(422).send(
              makeJsonApiError(422, "Unprocessable Entity", {
                code: "DUPLICATE_DEPENDENCY",
                detail: error.message,
              }),
            );
          }
          if (error instanceof CycleDetectedError) {
            return reply.code(422).send(
              makeJsonApiError(422, "Unprocessable Entity", {
                code: "CYCLE_DETECTED",
                detail: error.message,
              }),
            );
          }
          throw error;
        }
      },
    );
  }
}
