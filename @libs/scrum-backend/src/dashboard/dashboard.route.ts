import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityManager } from "@mikro-orm/core";
import { array, number, object, string } from "zod";
import { TaskEntity } from "#src/task/task.entity.js";
import { TaskAssigneeEntity } from "#src/task/task-assignee.entity.js";
import { jsonApiSerializeManyTasks, SerializedTaskSchema } from "#src/task/task.serializer.js";
import { jsonApiErrorDocumentSchema, makeJsonApiError, type Route } from "@libs/backend-shared";
import type { TimeTrackingPort } from "#src/dashboard/time-tracking.port.js";

export class DashboardRoute implements Route {
  public constructor(
    private em: EntityManager,
    private timeTrackingPort: TimeTrackingPort,
  ) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/",
      {
        schema: {
          querystring: object({
            projectId: string().optional(),
            sprintId: string().optional(),
          }),
          response: {
            200: object({
              data: object({
                type: string(),
                id: string(),
                attributes: object({
                  projectId: string(),
                  sprintId: string(),
                  tasksCompleted: number(),
                  tasksTotal: number(),
                  hoursTotal: number(),
                  pointsTotal: number(),
                  myTasks: array(SerializedTaskSchema),
                }),
              }),
            }),
            400: jsonApiErrorDocumentSchema,
          },
        },
      },
      async (request, reply) => {
        const { projectId, sprintId } = request.query;
        if (!projectId || !sprintId) {
          return reply.code(400).send(
            makeJsonApiError(400, "Bad Request", {
              code: "MISSING_PARAMS",
              detail: "projectId and sprintId are required",
            }),
          );
        }

        const currentUserId = request.user?.id ?? "";

        const sprintTasks = await this.em.find(TaskEntity, { projectId, sprintId });
        const tasksTotal = sprintTasks.length;
        const tasksCompleted = sprintTasks.filter((t) => t.status === "done").length;
        const pointsTotal = sprintTasks.reduce((acc, t) => acc + t.points, 0);

        const myAssignments = await this.em.find(TaskAssigneeEntity, { userId: currentUserId });
        const myAssignedIds = new Set(myAssignments.map((a) => a.taskId));
        const myTasks = sprintTasks.filter(
          (t) => myAssignedIds.has(t.id) || t.createdById === currentUserId,
        );

        const hoursTotal = await this.timeTrackingPort.sumHoursByUserAndSprint(
          currentUserId,
          sprintId,
        );

        return reply.send({
          data: {
            type: "dashboard" as const,
            id: `${projectId}:${sprintId}`,
            attributes: {
              projectId,
              sprintId,
              tasksCompleted,
              tasksTotal,
              hoursTotal,
              pointsTotal,
              myTasks: jsonApiSerializeManyTasks(myTasks),
            },
          },
        });
      },
    );
  }
}
