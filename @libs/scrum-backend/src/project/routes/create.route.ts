import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { ProjectEntityType } from "#src/project/project.entity.js";
import type { EntityRepository } from "@mikro-orm/core";
import { randomUUID } from "crypto";
import {
  jsonApiSerializeSingleProjectDocument,
  SerializedProjectSchema,
} from "#src/project/project.serializer.js";
import { ProjectTaskCounterEntity } from "#src/project/project-task-counter.entity.js";
import { object, string } from "zod";
import { makeSingleJsonApiTopDocument, type Route } from "@libs/backend-shared";
import { ProjectStatusSchema } from "#src/types.js";

export class CreateProjectRoute implements Route {
  public constructor(private repository: EntityRepository<ProjectEntityType>) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.post(
      "/",
      {
        schema: {
          body: makeSingleJsonApiTopDocument(
            object({
              id: string().optional().nullable(),
              attributes: object({
                name: string(),
                description: string(),
                status: ProjectStatusSchema,
                avatar: string().nullable().optional(),
                githubUrl: string().nullable().optional(),
                responsibleId: string(),
                createdById: string(),
              }),
            }),
          ),
          response: {
            200: makeSingleJsonApiTopDocument(SerializedProjectSchema),
          },
        },
      },
      async (request, reply) => {
        const body = request.body.data.attributes;

        const em = this.repository.getEntityManager();
        const project = this.repository.create({
          id: request.body.data.id || randomUUID(),
          name: body.name,
          description: body.description,
          status: body.status,
          avatar: body.avatar ?? null,
          githubUrl: body.githubUrl ?? null,
          responsibleId: body.responsibleId,
          createdById: body.createdById,
        });
        em.create(ProjectTaskCounterEntity, {
          projectId: project.id,
          nextNumber: 1001,
        });

        await em.flush();

        return reply.send(jsonApiSerializeSingleProjectDocument(project));
      },
    );
  }
}
