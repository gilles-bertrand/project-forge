import type { FastifyInstanceTypeForModule } from "#src/init.js";
import { wrap, type EntityRepository } from "@mikro-orm/core";
import { number, object, string } from "zod";
import {
  jsonApiSerializeSingleTimeEntryDocument,
  SerializedTimeEntrySchema,
} from "#src/serializers/time-entry.serializer.js";
import type { TimeEntryEntityType } from "#src/entities/time-entry.entity.js";
import {
  jsonApiErrorDocumentSchema,
  makeJsonApiError,
  makeSingleJsonApiTopDocument,
  type Route,
} from "@libs/backend-shared";

export class UpdateTimeEntryRoute implements Route {
  public constructor(private repository: EntityRepository<TimeEntryEntityType>) {}

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
                hours: number().optional(),
                date: string().optional(),
                description: string().nullable().optional(),
              }).partial(),
            }),
          ),
          response: {
            200: makeSingleJsonApiTopDocument(SerializedTimeEntrySchema),
            404: jsonApiErrorDocumentSchema,
          },
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const entry = await this.repository.findOne({ id });
        if (!entry) {
          return reply.code(404).send(
            makeJsonApiError(404, "Not Found", {
              code: "TIME_ENTRY_NOT_FOUND",
              detail: `TimeEntry with id ${id} not found`,
            }),
          );
        }

        const attrs = request.body.data.attributes;
        const update: Record<string, unknown> = { ...attrs };
        if (attrs.date) update.date = new Date(attrs.date);

        wrap(entry).assign(update);
        await this.repository.getEntityManager().flush();
        return reply.send(jsonApiSerializeSingleTimeEntryDocument(entry));
      },
    );
  }
}
