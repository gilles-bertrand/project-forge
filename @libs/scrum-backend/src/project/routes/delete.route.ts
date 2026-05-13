import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityManager, EntityRepository } from "@mikro-orm/core";
import { literal, object, string } from "zod";
import type { ProjectEntityType } from "#src/project/project.entity.js";
import { EpicEntity } from "#src/epic/epic.entity.js";
import { SprintEntity } from "#src/sprint/sprint.entity.js";
import { TaskEntity } from "#src/task/task.entity.js";
import { UserStoryEntity } from "#src/user-story/user-story.entity.js";
import {
  jsonApiErrorDocumentSchema,
  makeJsonApiError,
  makeSingleJsonApiTopDocument,
  type Route,
} from "@libs/backend-shared";

export class DeleteProjectRoute implements Route {
  public constructor(
    private repository: EntityRepository<ProjectEntityType>,
    private em: EntityManager,
  ) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.delete(
      "/:id",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            204: makeSingleJsonApiTopDocument(literal(null)),
            404: jsonApiErrorDocumentSchema,
            409: jsonApiErrorDocumentSchema,
          },
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const project = await this.repository.findOne({ id });

        if (!project) {
          return reply.code(404).send(
            makeJsonApiError(404, "Not Found", {
              code: "PROJECT_NOT_FOUND",
              detail: `Project with id ${id} not found`,
            }),
          );
        }

        const dependencies = await Promise.all([
          this.em.count(EpicEntity, { projectId: id }),
          this.em.count(UserStoryEntity, { projectId: id }),
          this.em.count(TaskEntity, { projectId: id }),
          this.em.count(SprintEntity, { projectId: id }),
        ]);
        const totalDeps = dependencies.reduce((acc, c) => acc + c, 0);

        if (totalDeps > 0) {
          return reply.code(409).send(
            makeJsonApiError(409, "Conflict", {
              code: "PROJECT_HAS_DEPENDENCIES",
              detail: `Project ${id} still has dependent epics/user-stories/tasks/sprints`,
            }),
          );
        }

        await this.repository.getEntityManager().remove(project).flush();
        return reply.code(204).send({ data: null });
      },
    );
  }
}
