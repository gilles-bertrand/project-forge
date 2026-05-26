import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityManager } from "@mikro-orm/core";
import { number, object, string } from "zod";
import { ProjectEntity } from "#src/project/project.entity.js";
import { SprintEntity } from "#src/sprint/sprint.entity.js";
import {
  jsonApiSerializeSingleSprintDocument,
  SerializedSprintSchema,
} from "#src/sprint/sprint.serializer.js";
import {
  jsonApiErrorDocumentSchema,
  makeJsonApiError,
  makeSingleJsonApiTopDocument,
  type Route,
} from "@libs/backend-shared";
import { createSprintForProject } from "#src/sprint/utils/create-sprint.js";

export class CreateSprintRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.post(
      "/",
      {
        schema: {
          body: makeSingleJsonApiTopDocument(
            object({
              attributes: object({
                projectId: string(),
                name: string().optional(),
                goal: string().nullable().optional(),
                startDate: string().optional(),
                endDate: string().optional(),
                velocityPoints: number().int().min(1).optional(),
              }),
            }),
          ),
          response: {
            200: makeSingleJsonApiTopDocument(SerializedSprintSchema),
            404: jsonApiErrorDocumentSchema,
            400: jsonApiErrorDocumentSchema,
          },
        },
      },
      async (request, reply) => {
        const attrs = request.body.data.attributes;

        const project = await this.em.findOne(ProjectEntity, { id: attrs.projectId });
        if (!project) {
          return reply.code(404).send(
            makeJsonApiError(404, "Not Found", {
              code: "PROJECT_NOT_FOUND",
              detail: `Project with id ${attrs.projectId} not found`,
            }),
          );
        }

        const previousSprint = await this.em.findOne(
          SprintEntity,
          { projectId: project.id },
          { orderBy: { endDate: "DESC" } },
        );

        const overrides: {
          name?: string;
          goal?: string | null;
          startDate?: Date;
          endDate?: Date;
          velocityPoints?: number;
        } = {};
        if (attrs.name) overrides.name = attrs.name;
        if (attrs.goal !== undefined) overrides.goal = attrs.goal;
        if (attrs.startDate) overrides.startDate = new Date(attrs.startDate);
        if (attrs.endDate) overrides.endDate = new Date(attrs.endDate);
        if (attrs.velocityPoints) overrides.velocityPoints = attrs.velocityPoints;

        if (overrides.startDate && overrides.endDate && overrides.endDate <= overrides.startDate) {
          return reply.code(400).send(
            makeJsonApiError(400, "Bad Request", {
              code: "INVALID_DATE_RANGE",
              detail: "endDate must be after startDate",
            }),
          );
        }

        const sprint = await createSprintForProject(this.em, project, previousSprint, overrides);
        return reply.send(jsonApiSerializeSingleSprintDocument(sprint));
      },
    );
  }
}
