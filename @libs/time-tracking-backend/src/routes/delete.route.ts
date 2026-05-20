import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityRepository } from "@mikro-orm/core";
import { z, object, string } from "zod";
import type { TimeEntryEntityType } from "#src/entities/time-entry.entity.js";
import { jsonApiErrorDocumentSchema, makeJsonApiError, type Route } from "@libs/backend-shared";

export class DeleteTimeEntryRoute implements Route {
  public constructor(private repository: EntityRepository<TimeEntryEntityType>) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.delete(
      "/:id",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            204: z.void(),
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
        await this.repository.getEntityManager().remove(entry).flush();
        return reply.code(204).send();
      },
    );
  }
}
