import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityManager } from "@mikro-orm/core";
import { number, object, string, z } from "zod";
import { SprintEntity } from "#src/sprint/sprint.entity.js";
import { computeSnapshot, getBurndown } from "#src/sprint/burndown.service.js";
import { jsonApiErrorDocumentSchema, makeJsonApiError, type Route } from "@libs/backend-shared";

const BurndownActualPointSchema = object({
  day: string(),
  remaining: number(),
  taskCount: number().int(),
});
const BurndownIdealPointSchema = object({
  day: string(),
  remaining: number(),
});

const BurndownResponseSchema = object({
  data: object({
    type: z.literal("sprint-burndowns"),
    id: string(),
    attributes: object({
      actual: z.array(BurndownActualPointSchema),
      ideal: z.array(BurndownIdealPointSchema),
    }),
  }),
  meta: object({
    sprintId: string(),
  }),
});

export class GetSprintBurndownRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/:id/burndown",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            200: BurndownResponseSchema,
            404: jsonApiErrorDocumentSchema,
          },
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const sprint = await this.em.findOne(SprintEntity, { id });
        if (!sprint) {
          return reply.code(404).send(
            makeJsonApiError(404, "Not Found", {
              code: "SPRINT_NOT_FOUND",
              detail: `Sprint with id ${id} not found`,
            }),
          );
        }
        const result = await getBurndown(this.em, id);
        return reply.send({
          data: {
            type: "sprint-burndowns" as const,
            id,
            attributes: result,
          },
          meta: { sprintId: id },
        });
      },
    );
  }
}

const SnapshotResponseSchema = object({
  data: object({
    type: z.literal("sprint-burndown-snapshots"),
    id: string(),
    attributes: object({
      created: z.boolean(),
    }),
  }),
});

export class CreateSprintBurndownSnapshotRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.post(
      "/:id/burndown-snapshot",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            200: SnapshotResponseSchema,
            404: jsonApiErrorDocumentSchema,
          },
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const sprint = await this.em.findOne(SprintEntity, { id });
        if (!sprint) {
          return reply.code(404).send(
            makeJsonApiError(404, "Not Found", {
              code: "SPRINT_NOT_FOUND",
              detail: `Sprint with id ${id} not found`,
            }),
          );
        }
        const { created, snapshot } = await computeSnapshot(this.em, id);
        return reply.send({
          data: {
            type: "sprint-burndown-snapshots" as const,
            id: snapshot.id,
            attributes: { created },
          },
        });
      },
    );
  }
}
