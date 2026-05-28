import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityRepository } from "@mikro-orm/core";
import { literal, object, string } from "zod";
import type { AcceptanceTestEntityType } from "#src/acceptance-test/acceptance-test.entity.js";
import {
  jsonApiErrorDocumentSchema,
  makeJsonApiError,
  makeSingleJsonApiTopDocument,
  type Route,
} from "@libs/backend-shared";

export class DeleteAcceptanceTestRoute implements Route {
  public constructor(private repository: EntityRepository<AcceptanceTestEntityType>) {}

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
        const at = await this.repository.findOne({ id });
        if (!at) {
          return reply.code(404).send(
            makeJsonApiError(404, "Not Found", {
              code: "ACCEPTANCE_TEST_NOT_FOUND",
              detail: `Acceptance test with id ${id} not found`,
            }),
          );
        }
        await this.repository.getEntityManager().remove(at).flush();
        return reply.code(204).send({ data: null });
      },
    );
  }
}
