import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityManager } from "@mikro-orm/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import { array, number, object, record, string, unknown } from "zod";
import { randomUUID } from "crypto";
import { CommentEntity } from "#src/task/comment.entity.js";
import {
  jsonApiSerializeComment,
  jsonApiSerializeManyComments,
  SerializedCommentSchema,
} from "#src/task/comment.serializer.js";
import {
  jsonApiErrorDocumentSchema,
  makeJsonApiError,
  makeSingleJsonApiTopDocument,
  type Route,
} from "@libs/backend-shared";
import { CommentTypeSchema, type SatelliteOwnerType } from "#src/types.js";
import { ensureOwnerExists } from "#src/task/owner-resolver.js";

export class ListCommentsByOwnerRoute implements Route {
  public constructor(
    private em: EntityManager,
    private ownerType: SatelliteOwnerType,
  ) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/:id/comments",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            200: object({
              data: array(SerializedCommentSchema),
              meta: object({ total: number() }),
            }),
            404: jsonApiErrorDocumentSchema,
          },
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const exists = await ensureOwnerExists(this.em, this.ownerType, id);
        if (!exists.ok) {
          return reply
            .code(404)
            .send(makeJsonApiError(404, "Not Found", { code: exists.code, detail: exists.detail }));
        }

        const items = await this.em.getRepository(CommentEntity).findAll({
          where: { ownerType: this.ownerType, ownerId: id },
          orderBy: { createdAt: "ASC" },
        });
        return reply.send({
          data: jsonApiSerializeManyComments(items),
          meta: { total: items.length },
        });
      },
    );
  }
}

export class AddCommentByOwnerRoute implements Route {
  public constructor(
    private em: EntityManager,
    private ownerType: SatelliteOwnerType,
  ) {}

  private async handle(
    request: FastifyRequest<{
      Params: { id: string };
      Body: {
        data: {
          attributes: {
            userId: string;
            content: string;
            type: string;
            metadata?: Record<string, unknown> | null;
          };
        };
      };
    }>,
    reply: FastifyReply,
  ) {
    const { id } = request.params;
    const exists = await ensureOwnerExists(this.em, this.ownerType, id);
    if (!exists.ok) {
      return reply
        .code(404)
        .send(makeJsonApiError(404, "Not Found", { code: exists.code, detail: exists.detail }));
    }

    const attrs = request.body.data.attributes;
    const comment = this.em.getRepository(CommentEntity).create({
      id: randomUUID(),
      ownerType: this.ownerType,
      ownerId: id,
      userId: attrs.userId,
      content: attrs.content,
      type: attrs.type,
      metadata: attrs.metadata ?? null,
    });
    await this.em.flush();
    return reply.send({ data: jsonApiSerializeComment(comment) });
  }

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.post(
      "/:id/comments",
      {
        schema: {
          params: object({ id: string() }),
          body: makeSingleJsonApiTopDocument(
            object({
              attributes: object({
                userId: string(),
                content: string(),
                type: CommentTypeSchema,
                metadata: record(string(), unknown()).nullable().optional(),
              }),
            }),
          ),
          response: {
            200: makeSingleJsonApiTopDocument(SerializedCommentSchema),
            404: jsonApiErrorDocumentSchema,
          },
        },
      },
      (request, reply) => this.handle(request as never, reply),
    );
  }
}

// Legacy aliases preserved for backward compatibility with existing routes
export class ListTaskCommentsRoute extends ListCommentsByOwnerRoute {
  public constructor(em: EntityManager) {
    super(em, "task");
  }
}

export class AddTaskCommentRoute extends AddCommentByOwnerRoute {
  public constructor(em: EntityManager) {
    super(em, "task");
  }
}

export { GetCommentRoute, DeleteCommentRoute } from "#src/task/routes/comments-flat.routes.js";
