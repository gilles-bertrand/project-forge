import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { TimeEntryEntityType } from "#src/entities/time-entry.entity.js";
import type { EntityRepository } from "@mikro-orm/core";
import { randomUUID } from "crypto";
import {
  jsonApiSerializeSingleTimeEntryDocument,
  SerializedTimeEntrySchema,
} from "#src/serializers/time-entry.serializer.js";
import { number, object, string } from "zod";
import { makeSingleJsonApiTopDocument, type Route } from "@libs/backend-shared";

export class CreateTimeEntryRoute implements Route {
  public constructor(private repository: EntityRepository<TimeEntryEntityType>) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.post(
      "/",
      {
        schema: {
          body: makeSingleJsonApiTopDocument(
            object({
              id: string().optional().nullable(),
              attributes: object({
                taskId: string(),
                userId: string(),
                projectId: string(),
                hours: number(),
                date: string(),
                description: string().nullable().optional(),
              }),
            }),
          ),
          response: {
            200: makeSingleJsonApiTopDocument(SerializedTimeEntrySchema),
          },
        },
      },
      async (request, reply) => {
        const body = request.body.data.attributes;
        const entry = this.repository.create({
          id: request.body.data.id || randomUUID(),
          taskId: body.taskId,
          userId: body.userId,
          projectId: body.projectId,
          hours: body.hours,
          date: new Date(body.date),
          description: body.description ?? null,
        });
        await this.repository.getEntityManager().flush();
        return reply.send(jsonApiSerializeSingleTimeEntryDocument(entry));
      },
    );
  }
}
