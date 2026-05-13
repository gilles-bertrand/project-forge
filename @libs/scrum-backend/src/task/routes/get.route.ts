import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityRepository } from "@mikro-orm/core";
import { object, string } from "zod";
import {
  jsonApiSerializeSingleTaskDocument,
  SerializedTaskSchema,
} from "#src/task/task.serializer.js";
import type { TaskEntityType } from "#src/task/task.entity.js";
import { jsonApiErrorDocumentSchema, makeJsonApiError, type Route } from "@libs/backend-shared";

export class GetTaskRoute implements Route {
  public constructor(private repository: EntityRepository<TaskEntityType>) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/:id",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            200: object({ data: SerializedTaskSchema }),
            404: jsonApiErrorDocumentSchema,
          },
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const task = await this.repository.findOne({ id });
        if (!task) {
          return reply.code(404).send(
            makeJsonApiError(404, "Not Found", {
              code: "TASK_NOT_FOUND",
              detail: `Task with id ${id} not found`,
            }),
          );
        }
        return reply.send(jsonApiSerializeSingleTaskDocument(task));
      },
    );
  }
}
