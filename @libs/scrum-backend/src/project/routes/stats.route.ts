import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityManager } from "@mikro-orm/core";
import { number, object, string } from "zod";
import { ProjectEntity } from "#src/project/project.entity.js";
import { EpicEntity } from "#src/epic/epic.entity.js";
import { UserStoryEntity } from "#src/user-story/user-story.entity.js";
import { TaskEntity } from "#src/task/task.entity.js";
import { SprintEntity } from "#src/sprint/sprint.entity.js";
import { jsonApiErrorDocumentSchema, makeJsonApiError, type Route } from "@libs/backend-shared";

export class GetProjectStatsRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/:id/stats",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            200: object({
              data: object({
                projectId: string(),
                epics: object({ total: number(), done: number() }),
                userStories: object({ total: number(), done: number() }),
                tasks: object({ total: number(), done: number() }),
                sprints: object({ total: number(), active: number() }),
                currentSprint: object({
                  id: string().nullable(),
                  tasksDone: number(),
                  tasksTotal: number(),
                }),
              }),
            }),
            404: jsonApiErrorDocumentSchema,
          },
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const project = await this.em.findOne(ProjectEntity, { id });
        if (!project) {
          return reply.code(404).send(
            makeJsonApiError(404, "Not Found", {
              code: "PROJECT_NOT_FOUND",
              detail: `Project with id ${id} not found`,
            }),
          );
        }

        const [
          epicsTotal,
          epicsDone,
          storiesTotal,
          storiesDone,
          tasksTotal,
          tasksDone,
          sprintsTotal,
          sprintsActive,
        ] = await Promise.all([
          this.em.count(EpicEntity, { projectId: id }),
          this.em.count(EpicEntity, { projectId: id, status: "done" }),
          this.em.count(UserStoryEntity, { projectId: id }),
          this.em.count(UserStoryEntity, { projectId: id, status: "done" }),
          this.em.count(TaskEntity, { projectId: id }),
          this.em.count(TaskEntity, { projectId: id, status: "done" }),
          this.em.count(SprintEntity, { projectId: id }),
          this.em.count(SprintEntity, { projectId: id, status: "active" }),
        ]);

        const activeSprint = await this.em.findOne(SprintEntity, {
          projectId: id,
          status: "active",
        });

        let currentSprint: { id: string | null; tasksDone: number; tasksTotal: number } = {
          id: null,
          tasksDone: 0,
          tasksTotal: 0,
        };

        if (activeSprint) {
          const [csTotal, csDone] = await Promise.all([
            this.em.count(TaskEntity, { projectId: id, sprintId: activeSprint.id }),
            this.em.count(TaskEntity, {
              projectId: id,
              sprintId: activeSprint.id,
              status: "done",
            }),
          ]);
          currentSprint = { id: activeSprint.id, tasksDone: csDone, tasksTotal: csTotal };
        }

        return reply.send({
          data: {
            projectId: id,
            epics: { total: epicsTotal, done: epicsDone },
            userStories: { total: storiesTotal, done: storiesDone },
            tasks: { total: tasksTotal, done: tasksDone },
            sprints: { total: sprintsTotal, active: sprintsActive },
            currentSprint,
          },
        });
      },
    );
  }
}
