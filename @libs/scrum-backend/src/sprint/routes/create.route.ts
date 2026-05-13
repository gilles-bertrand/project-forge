import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { SprintEntityType } from "#src/sprint/sprint.entity.js";
import type { EntityRepository } from "@mikro-orm/core";
import { randomUUID } from "crypto";
import {
  jsonApiSerializeSingleSprintDocument,
  SerializedSprintSchema,
} from "#src/sprint/sprint.serializer.js";
import { number, object, string } from "zod";
import { makeSingleJsonApiTopDocument, type Route } from "@libs/backend-shared";
import { SprintStatusSchema } from "#src/types.js";

export class CreateSprintRoute implements Route {
  public constructor(private repository: EntityRepository<SprintEntityType>) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.post(
      "/",
      {
        schema: {
          body: makeSingleJsonApiTopDocument(
            object({
              id: string().optional().nullable(),
              attributes: object({
                name: string(),
                goal: string().nullable().optional(),
                projectId: string(),
                startDate: string(),
                endDate: string(),
                status: SprintStatusSchema,
                velocityPoints: number().int().optional(),
                completedPoints: number().int().optional(),
              }),
            }),
          ),
          response: {
            200: makeSingleJsonApiTopDocument(SerializedSprintSchema),
          },
        },
      },
      async (request, reply) => {
        const body = request.body.data.attributes;
        const sprint = this.repository.create({
          id: request.body.data.id || randomUUID(),
          name: body.name,
          goal: body.goal ?? null,
          projectId: body.projectId,
          startDate: new Date(body.startDate),
          endDate: new Date(body.endDate),
          status: body.status,
          velocityPoints: body.velocityPoints ?? 0,
          completedPoints: body.completedPoints ?? 0,
        });
        await this.repository.getEntityManager().flush();
        return reply.send(jsonApiSerializeSingleSprintDocument(sprint));
      },
    );
  }
}
