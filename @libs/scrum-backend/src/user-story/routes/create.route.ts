import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { UserStoryEntityType } from "#src/user-story/user-story.entity.js";
import type { EntityRepository } from "@mikro-orm/core";
import { randomUUID } from "crypto";
import {
  jsonApiSerializeSingleUserStoryDocument,
  SerializedUserStorySchema,
} from "#src/user-story/user-story.serializer.js";
import { array, number, object, string } from "zod";
import { makeSingleJsonApiTopDocument, type Route } from "@libs/backend-shared";
import { StoryPrioritySchema, StoryStatusSchema } from "#src/types.js";

export class CreateUserStoryRoute implements Route {
  public constructor(private repository: EntityRepository<UserStoryEntityType>) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.post(
      "/",
      {
        schema: {
          body: makeSingleJsonApiTopDocument(
            object({
              id: string().optional().nullable(),
              attributes: object({
                title: string(),
                description: string(),
                projectId: string(),
                epicId: string().nullable().optional(),
                status: StoryStatusSchema.optional().default("suggested"),
                points: number().int().nullable().optional(),
                priority: StoryPrioritySchema.optional().default("Moyenne"),
                notes: string().nullable().optional(),
                color: string().nullable().optional(),
                rank: number().int().optional().default(0),
                value: number().int().nullable().optional(),
                createdById: string().nullable().optional(),
                tags: array(string()).optional().default([]),
              }),
            }),
          ),
          response: {
            200: makeSingleJsonApiTopDocument(SerializedUserStorySchema),
          },
        },
      },
      async (request, reply) => {
        const body = request.body.data.attributes;
        const story = this.repository.create({
          id: request.body.data.id || randomUUID(),
          title: body.title,
          description: body.description,
          projectId: body.projectId,
          epicId: body.epicId ?? null,
          status: body.status,
          points: body.points ?? null,
          priority: body.priority,
          notes: body.notes ?? null,
          color: body.color ?? null,
          rank: body.rank,
          value: body.value ?? null,
          createdById: body.createdById ?? null,
          tags: body.tags,
        });
        await this.repository.getEntityManager().flush();
        return reply.send(jsonApiSerializeSingleUserStoryDocument(story));
      },
    );
  }
}
