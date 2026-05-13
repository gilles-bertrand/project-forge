import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EpicEntityType } from "#src/epic/epic.entity.js";
import type { EntityRepository } from "@mikro-orm/core";
import { randomUUID } from "crypto";
import {
  jsonApiSerializeSingleEpicDocument,
  SerializedEpicSchema,
} from "#src/epic/epic.serializer.js";
import { object, string } from "zod";
import { makeSingleJsonApiTopDocument, type Route } from "@libs/backend-shared";
import { EpicStatusSchema } from "#src/types.js";

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
        });
        await this.repository.getEntityManager().flush();
        return reply.send(jsonApiSerializeSingleEpicDocument(epic));
      },
    );
  }
}
