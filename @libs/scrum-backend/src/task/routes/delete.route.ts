import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityRepository } from "@mikro-orm/core";
import { literal, object, string } from "zod";
import type { TaskEntityType } from "#src/task/task.entity.js";
import {
  jsonApiErrorDocumentSchema,
  makeJsonApiError,
  makeSingleJsonApiTopDocument,
  type Route,
} from "@libs/backend-shared";

export class DeleteTaskRoute implements Route {
  public constructor(private repository: EntityRepository<TaskEntityType>) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.delete(
      "/:id",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            204: makeSingleJsonApiTopDocument(literal(null)),
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
        await this.repository.getEntityManager().remove(task).flush();
        return reply.code(204).send({ data: null });
      },
    );
  }
}
