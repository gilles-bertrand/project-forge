import type { FastifyInstanceTypeForModule } from "#src/init.js";
import { wrap, type EntityRepository } from "@mikro-orm/core";
import { number, object, string } from "zod";
import type { AcceptanceTestEntityType } from "#src/acceptance-test/acceptance-test.entity.js";
import {
  jsonApiSerializeSingleAcceptanceTestDocument,
  SerializedAcceptanceTestSchema,
} from "#src/acceptance-test/acceptance-test.serializer.js";
import {
  jsonApiErrorDocumentSchema,
  makeJsonApiError,
  makeSingleJsonApiTopDocument,
  type Route,
} from "@libs/backend-shared";
import { AcceptanceTestStateSchema } from "#src/types.js";

export class UpdateAcceptanceTestRoute implements Route {
  public constructor(private repository: EntityRepository<AcceptanceTestEntityType>) {}

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
                name: string().optional(),
                description: string().optional(),
                state: AcceptanceTestStateSchema.optional(),
                rank: number().int().optional(),
              }).partial(),
            }),
          ),
          response: {
            200: makeSingleJsonApiTopDocument(SerializedAcceptanceTestSchema),
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
        wrap(at).assign(request.body.data.attributes);
        await this.repository.getEntityManager().flush();
        return reply.send(jsonApiSerializeSingleAcceptanceTestDocument(at));
      },
    );
  }
}
