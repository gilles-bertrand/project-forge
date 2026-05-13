import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityRepository } from "@mikro-orm/core";
import { object, string } from "zod";
import {
  jsonApiSerializeSingleSprintDocument,
  SerializedSprintSchema,
} from "#src/sprint/sprint.serializer.js";
import type { SprintEntityType } from "#src/sprint/sprint.entity.js";
import { jsonApiErrorDocumentSchema, makeJsonApiError, type Route } from "@libs/backend-shared";

export class GetSprintRoute implements Route {
  public constructor(private repository: EntityRepository<SprintEntityType>) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/:id",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            200: object({ data: SerializedSprintSchema }),
            404: jsonApiErrorDocumentSchema,
          },
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const sprint = await this.repository.findOne({ id });
        if (!sprint) {
          return reply.code(404).send(
            makeJsonApiError(404, "Not Found", {
              code: "SPRINT_NOT_FOUND",
              detail: `Sprint with id ${id} not found`,
            }),
          );
        }
        return reply.send(jsonApiSerializeSingleSprintDocument(sprint));
      },
    );
  }
}
