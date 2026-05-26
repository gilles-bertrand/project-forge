import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityManager } from "@mikro-orm/core";
import { array, number, object, string } from "zod";
import { SprintEntity } from "#src/sprint/sprint.entity.js";
import { TaskEntity } from "#src/task/task.entity.js";
import { UserStoryEntity } from "#src/user-story/user-story.entity.js";
import { jsonApiErrorDocumentSchema, makeJsonApiError, type Route } from "@libs/backend-shared";

const UnfinishedItemSchema = object({ id: string(), title: string(), status: string() });
const AvailableSprintSchema = object({
  id: string(),
  number: number().int(),
  name: string(),
  startDate: string(),
});

export class CloseSprintPreviewRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/:id/close-preview",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            200: object({
              data: object({
                sprintId: string(),
                sprintName: string(),
                number: number().int(),
                unfinishedTasks: array(UnfinishedItemSchema),
                unfinishedStories: array(UnfinishedItemSchema),
                availableNextSprints: array(AvailableSprintSchema),
              }),
            }),
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

        const [unfinishedTasks, unfinishedStories, availableSprints] = await Promise.all([
          this.em.find(TaskEntity, { sprintId: id, status: { $ne: "done" } }),
          this.em.find(UserStoryEntity, {
            sprintId: id,
            status: { $ne: "done" },
          }),
          this.em.find(
            SprintEntity,
            { projectId: sprint.projectId, status: "planned" },
            { orderBy: { startDate: "ASC" } },
          ),
        ]);

        return reply.send({
          data: {
            sprintId: sprint.id,
            sprintName: sprint.name,
            number: sprint.number ?? 0,
            unfinishedTasks: unfinishedTasks.map((t) => ({
              id: t.id,
              title: t.title,
              status: t.status,
            })),
            unfinishedStories: unfinishedStories.map((s) => ({
              id: s.id,
              title: s.title,
              status: s.status,
            })),
            availableNextSprints: availableSprints.map((s) => ({
              id: s.id,
              number: s.number ?? 0,
              name: s.name,
              startDate: s.startDate.toISOString(),
            })),
          },
        });
      },
    );
  }
}
