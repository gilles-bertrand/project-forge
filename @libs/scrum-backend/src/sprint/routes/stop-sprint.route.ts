import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityManager } from "@mikro-orm/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import { number, object, string } from "zod";
import {
  jsonApiSerializeSingleSprintDocument,
  SerializedSprintSchema,
} from "#src/sprint/sprint.serializer.js";
import { SprintEntity } from "#src/sprint/sprint.entity.js";
import { jsonApiErrorDocumentSchema, makeJsonApiError, type Route } from "@libs/backend-shared";
import {
  getUnfinishedItems,
  recomputeCompletedPoints,
  resolveTargetSprintId,
  transferUnfinished,
  type StopAttributes,
} from "#src/sprint/routes/stop-sprint.helpers.js";

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const StopBodySchema = object({
  data: object({
    attributes: object({
      action: string().optional(),
      targetSprintId: string().optional(),
      createSprintConfig: object({
        startDate: string().optional(),
        endDate: string().optional(),
        name: string().optional(),
        velocityPoints: number().int().optional(),
      })
        .optional()
        .nullable(),
    }),
  }),
}).optional();

export const StopResponseSchema = object({
  data: SerializedSprintSchema,
  meta: object({
    movedTasks: number().int(),
    movedStories: number().int(),
    targetSprintId: string().nullable(),
    action: string().nullable(),
  }),
});

type StopBody = { data?: { attributes?: StopAttributes } };
type SprintLike = { id: string; projectId: string; status: string; completedPoints: number };

// ─── Module-level guard ───────────────────────────────────────────────────────

async function guardActiveSprint(em: EntityManager, id: string, reply: FastifyReply) {
  const sprint = await em.findOne(SprintEntity, { id });
  if (!sprint) {
    await reply.code(404).send(
      makeJsonApiError(404, "Not Found", {
        code: "SPRINT_NOT_FOUND",
        detail: `Sprint ${id} not found`,
      }),
    );
    return null;
  }
  if (sprint.status !== "active") {
    await reply.code(409).send(
      makeJsonApiError(409, "Conflict", {
        code: "SPRINT_NOT_ACTIVE",
        detail: `Sprint must be 'active' to stop (current: ${sprint.status})`,
      }),
    );
    return null;
  }
  return sprint;
}

// ─── Route ───────────────────────────────────────────────────────────────────

export class StopSprintRoute implements Route {
  public constructor(private em: EntityManager) {}

  private async applyAction(
    sprintId: string,
    action: string,
    attrs: StopAttributes | undefined,
    sprint: { id: string; projectId: string },
    unfinishedCount: number,
  ): Promise<
    | { resolvedTargetId: string | null }
    | { httpCode: number; error: Parameters<typeof makeJsonApiError> }
  > {
    const resolved = await resolveTargetSprintId(this.em, sprint, action, attrs);
    if (resolved.error) {
      return { httpCode: resolved.error[0] as number, error: resolved.error };
    }
    if (unfinishedCount > 0) {
      await transferUnfinished(this.em, sprintId, resolved.targetSprintId);
    }
    return { resolvedTargetId: resolved.targetSprintId };
  }

  private buildResponse(
    sprint: SprintLike,
    tasks: unknown[],
    stories: unknown[],
    targetSprintId: string | null,
    action: string | null,
  ) {
    return {
      data: jsonApiSerializeSingleSprintDocument(sprint as never).data,
      meta: {
        movedTasks: tasks.length,
        movedStories: stories.length,
        targetSprintId,
        action,
      },
    };
  }

  private async handle(
    request: FastifyRequest<{ Params: { id: string }; Body: StopBody }>,
    reply: FastifyReply,
  ) {
    const { id } = request.params;
    const sprint = await guardActiveSprint(this.em, id, reply);
    if (!sprint) return;

    const { tasks, stories } = await getUnfinishedItems(this.em, id);
    const unfinishedCount = tasks.length + stories.length;
    const attrs = request.body?.data?.attributes;
    const action = attrs?.action ?? null;

    if (unfinishedCount > 0 && !action) {
      return reply.code(422).send(
        makeJsonApiError(422, "Action Required", {
          code: "CLOSE_ACTION_REQUIRED",
          detail: `Sprint has ${unfinishedCount} unfinished items. Provide action: send-to-backlog | move-to-existing | move-to-next`,
        }),
      );
    }

    let resolvedTargetId: string | null = null;
    if (action) {
      const result = await this.applyAction(id, action, attrs, sprint, unfinishedCount);
      if ("error" in result) {
        return reply.code(result.httpCode).send(makeJsonApiError(...result.error));
      }
      resolvedTargetId = result.resolvedTargetId;
    }

    sprint.status = "completed";
    sprint.completedPoints = await recomputeCompletedPoints(this.em, id);
    await this.em.flush();
    return reply.send(this.buildResponse(sprint, tasks, stories, resolvedTargetId, action));
  }

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.post(
      "/:id/stop",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            200: StopResponseSchema,
            404: jsonApiErrorDocumentSchema,
            409: jsonApiErrorDocumentSchema,
            422: jsonApiErrorDocumentSchema,
          },
        },
      },
      (request, reply) => this.handle(request as never, reply),
    );
  }
}
