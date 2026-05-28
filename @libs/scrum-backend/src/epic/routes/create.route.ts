import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EpicEntityType } from "#src/epic/epic.entity.js";
import type { EntityRepository } from "@mikro-orm/core";
import { randomUUID } from "crypto";
import {
  jsonApiSerializeSingleEpicDocument,
  SerializedEpicSchema,
} from "#src/epic/epic.serializer.js";
import { array, number, object, string } from "zod";
import { makeSingleJsonApiTopDocument, type Route } from "@libs/backend-shared";
import { EpicStatusSchema, EpicTypeSchema } from "#src/types.js";

export class CreateEpicRoute implements Route {
  public constructor(private repository: EntityRepository<EpicEntityType>) {}

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
                status: EpicStatusSchema,
                notes: string().nullable().optional(),
                color: string().optional().default("#6B7280"),
                type: EpicTypeSchema.optional().default("functional"),
                value: number().int().nullable().optional(),
                rank: number().int().optional().default(0),
                createdById: string().nullable().optional(),
                tags: array(string()).optional().default([]),
              }),
            }),
          ),
          response: {
            200: makeSingleJsonApiTopDocument(SerializedEpicSchema),
          },
        },
      },
      async (request, reply) => {
        const body = request.body.data.attributes;
        const epic = this.repository.create({
          id: request.body.data.id || randomUUID(),
          title: body.title,
          description: body.description,
          projectId: body.projectId,
          status: body.status,
          notes: body.notes ?? null,
          color: body.color,
          type: body.type,
          value: body.value ?? null,
          rank: body.rank,
          createdById: body.createdById ?? null,
          tags: body.tags,
        });
        await this.repository.getEntityManager().flush();
        return reply.send(jsonApiSerializeSingleEpicDocument(epic));
      },
    );
  }
}
