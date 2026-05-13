import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityRepository } from "@mikro-orm/core";
import { literal, object, string } from "zod";
import type { EpicEntityType } from "#src/epic/epic.entity.js";
import {
  jsonApiErrorDocumentSchema,
  makeJsonApiError,
  makeSingleJsonApiTopDocument,
  type Route,
} from "@libs/backend-shared";

export class DeleteEpicRoute implements Route {
  public constructor(private repository: EntityRepository<EpicEntityType>) {}

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
        const epic = await this.repository.findOne({ id });
        if (!epic) {
          return reply.code(404).send(
            makeJsonApiError(404, "Not Found", {
              code: "EPIC_NOT_FOUND",
              detail: `Epic with id ${id} not found`,
            }),
          );
        }
        await this.repository.getEntityManager().remove(epic).flush();
        return reply.code(204).send({ data: null });
      },
    );
  }
}
