import type { FastifyInstanceTypeForModule } from "#src/init.js";
import { wrap, type EntityRepository } from "@mikro-orm/core";
import { object, string } from "zod";
import {
  jsonApiSerializeSingleProjectDocument,
  SerializedProjectSchema,
} from "#src/project/project.serializer.js";
import type { ProjectEntityType } from "#src/project/project.entity.js";
import {
  jsonApiErrorDocumentSchema,
  makeJsonApiError,
  makeSingleJsonApiTopDocument,
  type Route,
} from "@libs/backend-shared";
import { ProjectStatusSchema } from "#src/types.js";

export class UpdateProjectRoute implements Route {
  public constructor(private repository: EntityRepository<ProjectEntityType>) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.patch(
      "/:id",
      {
        schema: {
          params: object({ id: string() }),
          body: makeSingleJsonApiTopDocument(
            object({
              id: string().optional(),
              type: string().optional(),
              attributes: object({
                name: string().optional(),
                description: string().optional(),
                status: ProjectStatusSchema.optional(),
                avatar: string().nullable().optional(),
                githubUrl: string().nullable().optional(),
                responsibleId: string().optional(),
              }).partial(),
            }),
          ),
          response: {
            200: makeSingleJsonApiTopDocument(SerializedProjectSchema),
            404: jsonApiErrorDocumentSchema,
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

        wrap(project).assign(request.body.data.attributes);
        await this.repository.getEntityManager().flush();

        return reply.send(jsonApiSerializeSingleProjectDocument(project));
      },
    );
  }
}
