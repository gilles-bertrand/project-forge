import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityManager } from "@mikro-orm/core";
import { array, number, object, string } from "zod";
import { TaskEntity } from "#src/task/task.entity.js";
import { HistoryEntryEntity } from "#src/task/history-entry.entity.js";
import {
  jsonApiSerializeManyHistoryEntries,
  SerializedHistoryEntrySchema,
} from "#src/task/history-entry.serializer.js";
import { jsonApiErrorDocumentSchema, makeJsonApiError, type Route } from "@libs/backend-shared";

export class ListTaskHistoryRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/:id/history",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            200: object({
              data: array(SerializedHistoryEntrySchema),
              meta: object({ total: number() }),
            }),
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

        const items = await this.em.getRepository(HistoryEntryEntity).findAll({
          where: { ownerType: "task", ownerId: id },
          orderBy: { createdAt: "DESC" },
        });
        return reply.send({
          data: jsonApiSerializeManyHistoryEntries(items),
          meta: { total: items.length },
        });
      },
    );
  }
}
