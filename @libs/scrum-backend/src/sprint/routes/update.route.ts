import type { FastifyInstanceTypeForModule } from "#src/init.js";
import { wrap, type EntityRepository } from "@mikro-orm/core";
import { number, object, string } from "zod";
import {
  jsonApiSerializeSingleSprintDocument,
  SerializedSprintSchema,
} from "#src/sprint/sprint.serializer.js";
import type { SprintEntityType } from "#src/sprint/sprint.entity.js";
import {
  jsonApiErrorDocumentSchema,
  makeJsonApiError,
  makeSingleJsonApiTopDocument,
  type Route,
} from "@libs/backend-shared";
import { SprintStatusSchema } from "#src/types.js";

export class UpdateSprintRoute implements Route {
  public constructor(private repository: EntityRepository<SprintEntityType>) {}

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
                goal: string().nullable().optional(),
                startDate: string().optional(),
                endDate: string().optional(),
                status: SprintStatusSchema.optional(),
                velocityPoints: number().int().optional(),
                completedPoints: number().int().optional(),
              }).partial(),
            }),
          ),
          response: {
            200: makeSingleJsonApiTopDocument(SerializedSprintSchema),
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

        const attrs = request.body.data.attributes;
        const update: Record<string, unknown> = { ...attrs };
        if (attrs.startDate) update.startDate = new Date(attrs.startDate);
        if (attrs.endDate) update.endDate = new Date(attrs.endDate);

        wrap(sprint).assign(update);
        await this.repository.getEntityManager().flush();
        return reply.send(jsonApiSerializeSingleSprintDocument(sprint));
      },
    );
  }
}
