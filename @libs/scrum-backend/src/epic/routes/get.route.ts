import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityRepository } from "@mikro-orm/core";
import { object, string } from "zod";
import {
  jsonApiSerializeSingleEpicDocument,
  SerializedEpicSchema,
} from "#src/epic/epic.serializer.js";
import type { EpicEntityType } from "#src/epic/epic.entity.js";
import { jsonApiErrorDocumentSchema, makeJsonApiError, type Route } from "@libs/backend-shared";

export class GetEpicRoute implements Route {
  public constructor(private repository: EntityRepository<EpicEntityType>) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/:id",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            200: object({ data: SerializedEpicSchema }),
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
        return reply.send(jsonApiSerializeSingleEpicDocument(epic));
      },
    );
  }
}
