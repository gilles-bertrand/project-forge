import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityManager } from "@mikro-orm/core";
import { array, number, object, string } from "zod";
import { AcceptanceTestEntity } from "#src/acceptance-test/acceptance-test.entity.js";
import { TaskEntity } from "#src/task/task.entity.js";
import {
  jsonApiSerializeManyAcceptanceTests,
  SerializedAcceptanceTestSchema,
} from "#src/acceptance-test/acceptance-test.serializer.js";
import { jsonApiErrorDocumentSchema, makeJsonApiError, type Route } from "@libs/backend-shared";

export class ListByTaskAcceptanceTestRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/:id/acceptance-tests",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            200: object({
              data: array(SerializedAcceptanceTestSchema),
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
        const items = await this.em.getRepository(AcceptanceTestEntity).findAll({
          where: { taskId: id },
          orderBy: { rank: "ASC" },
        });
        return reply.send({
          data: jsonApiSerializeManyAcceptanceTests(items),
          meta: { total: items.length },
        });
      },
    );
  }
}
