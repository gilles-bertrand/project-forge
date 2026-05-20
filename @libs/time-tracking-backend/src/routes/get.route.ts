import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityRepository } from "@mikro-orm/core";
import { object, string } from "zod";
import {
  jsonApiSerializeSingleTimeEntryDocument,
  SerializedTimeEntrySchema,
} from "#src/serializers/time-entry.serializer.js";
import type { TimeEntryEntityType } from "#src/entities/time-entry.entity.js";
import { jsonApiErrorDocumentSchema, makeJsonApiError, type Route } from "@libs/backend-shared";

export class GetTimeEntryRoute implements Route {
  public constructor(private repository: EntityRepository<TimeEntryEntityType>) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/:id",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            200: object({ data: SerializedTimeEntrySchema }),
            404: jsonApiErrorDocumentSchema,
          },
        },
      },
      async (request, reply) => {
        const { id } = request.params;
        const entry = await this.repository.findOne({ id });
        if (!entry) {
          return reply.code(404).send(
            makeJsonApiError(404, "Not Found", {
              code: "TIME_ENTRY_NOT_FOUND",
              detail: `TimeEntry with id ${id} not found`,
            }),
          );
        }
        return reply.send(jsonApiSerializeSingleTimeEntryDocument(entry));
      },
    );
  }
}
