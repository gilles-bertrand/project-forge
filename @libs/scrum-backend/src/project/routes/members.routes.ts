import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityManager } from "@mikro-orm/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import { array, literal, number, object, string } from "zod";
import { randomUUID } from "crypto";
import { ProjectEntity } from "#src/project/project.entity.js";
import { ProjectMemberEntity } from "#src/project/project-member.entity.js";
import {
  jsonApiSerializeManyProjectMembers,
  jsonApiSerializeProjectMember,
  SerializedProjectMemberSchema,
} from "#src/project/project-member.serializer.js";
import {
  jsonApiErrorDocumentSchema,
  makeJsonApiError,
  makeSingleJsonApiTopDocument,
  type Route,
} from "@libs/backend-shared";
import { ProjectMemberRoleSchema } from "#src/types.js";

export class ListProjectMembersRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/:id/members",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            200: object({
              data: array(SerializedProjectMemberSchema),
              meta: object({ total: number() }),
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

        const members = await this.em
          .getRepository(ProjectMemberEntity)
          .findAll({ where: { projectId: id } });
        return reply.send({
          data: jsonApiSerializeManyProjectMembers(members),
          meta: { total: members.length },
        });
      },
    );
  }
}

export class AddProjectMemberRoute implements Route {
  public constructor(private em: EntityManager) {}

  private async handle(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { data: { attributes: { userId: string; role: string } } };
    }>,
    reply: FastifyReply,
  ) {
    const { id } = request.params;
    const project = await this.em.findOne(ProjectEntity, { id });
    if (!project) {
      return reply.code(404).send(
        makeJsonApiError(404, "Not Found", {
          code: "PROJECT_NOT_FOUND",
          detail: `Project with id ${id} not found`,
        }),
      );
    }

    const attrs = request.body.data.attributes;
    const repo = this.em.getRepository(ProjectMemberEntity);

    const existing = await repo.findOne({ projectId: id, userId: attrs.userId });
    if (existing) {
      return reply.code(409).send(
        makeJsonApiError(409, "Conflict", {
          code: "MEMBER_ALREADY_EXISTS",
          detail: `User ${attrs.userId} is already a member of project ${id}`,
        }),
      );
    }

    const member = repo.create({
      id: randomUUID(),
      projectId: id,
      userId: attrs.userId,
      role: attrs.role,
    });
    await this.em.flush();
    return reply.send({ data: jsonApiSerializeProjectMember(member) });
  }

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.post(
      "/:id/members",
      {
        schema: {
          params: object({ id: string() }),
          body: makeSingleJsonApiTopDocument(
            object({
              attributes: object({
                userId: string(),
                role: ProjectMemberRoleSchema,
              }),
            }),
          ),
          response: {
            200: makeSingleJsonApiTopDocument(SerializedProjectMemberSchema),
            404: jsonApiErrorDocumentSchema,
            409: jsonApiErrorDocumentSchema,
          },
        },
      },
      (request, reply) => this.handle(request as never, reply),
    );
  }
}

export class RemoveProjectMemberRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.delete(
      "/:id/members/:userId",
      {
        schema: {
          params: object({ id: string(), userId: string() }),
          response: {
            204: makeSingleJsonApiTopDocument(literal(null)),
            404: jsonApiErrorDocumentSchema,
          },
        },
      },
      async (request, reply) => {
        const { id, userId } = request.params as { id: string; userId: string };
        const member = await this.em
          .getRepository(ProjectMemberEntity)
          .findOne({ projectId: id, userId });

        if (!member) {
          return reply.code(404).send(
            makeJsonApiError(404, "Not Found", {
              code: "MEMBER_NOT_FOUND",
              detail: `Member ${userId} not found in project ${id}`,
            }),
          );
        }

        await this.em.remove(member).flush();
        return reply.code(204).send({ data: null });
      },
    );
  }
}
