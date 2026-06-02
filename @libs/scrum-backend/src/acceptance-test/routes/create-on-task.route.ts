import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityManager } from "@mikro-orm/core";
import { number, object, string } from "zod";
import { randomUUID } from "crypto";
import { AcceptanceTestEntity } from "#src/acceptance-test/acceptance-test.entity.js";
import { TaskEntity } from "#src/task/task.entity.js";
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

export class CreateOnTaskAcceptanceTestRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.post(
      "/:id/acceptance-tests",
      {
        schema: {
          params: object({ id: string() }),
          body: makeSingleJsonApiTopDocument(
            object({
              attributes: object({
                name: string(),
                description: string(),
                state: AcceptanceTestStateSchema.optional().default("to-check"),
                rank: number().int().optional().default(0),
                createdById: string().nullable().optional(),
              }),
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
        const task = await this.em.findOne(TaskEntity, { id });
        if (!task) {
          return reply.code(404).send(
            makeJsonApiError(404, "Not Found", {
              code: "TASK_NOT_FOUND",
              detail: `Task with id ${id} not found`,
            }),
          );
        }

        const attrs = request.body.data.attributes;
        const at = this.em.getRepository(AcceptanceTestEntity).create({
          id: randomUUID(),
          taskId: id,
          userStoryId: null,
          name: attrs.name,
          description: attrs.description,
          state: attrs.state,
          rank: attrs.rank,
          createdById: attrs.createdById ?? null,
        });
        await this.em.flush();
        return reply.send(jsonApiSerializeSingleAcceptanceTestDocument(at));
      },
    );
  }
}
