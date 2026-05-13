import type { FastifyInstanceTypeForModule } from "#src/init.js";
import { wrap, type EntityRepository } from "@mikro-orm/core";
import { object, string } from "zod";
import {
  jsonApiSerializeSingleEpicDocument,
  SerializedEpicSchema,
} from "#src/epic/epic.serializer.js";
import type { EpicEntityType } from "#src/epic/epic.entity.js";
import {
  jsonApiErrorDocumentSchema,
  makeJsonApiError,
  makeSingleJsonApiTopDocument,
  type Route,
} from "@libs/backend-shared";
import { EpicStatusSchema } from "#src/types.js";

export class UpdateEpicRoute implements Route {
  public constructor(private repository: EntityRepository<EpicEntityType>) {}

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
                status: EpicStatusSchema.optional(),
              }).partial(),
            }),
          ),
          response: {
            200: makeSingleJsonApiTopDocument(SerializedEpicSchema),
            404: jsonApiErrorDocumentSchema,
          },
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const epic = await this.repository.findOne({ id });
        if (!epic) {
          return reply.code(404).send(
            makeJsonApiError(404, "Not Found", {
              code: "EPIC_NOT_FOUND",
              detail: `Epic with id ${id} not found`,
            }),
          );
        }
        wrap(epic).assign(request.body.data.attributes);
        await this.repository.getEntityManager().flush();
        return reply.send(jsonApiSerializeSingleEpicDocument(epic));
      },
    );
  }
}
