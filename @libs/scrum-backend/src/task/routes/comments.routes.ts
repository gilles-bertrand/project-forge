import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityManager } from "@mikro-orm/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import { array, literal, number, object, record, string, unknown } from "zod";
import { randomUUID } from "crypto";
import { TaskEntity } from "#src/task/task.entity.js";
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
import { CommentTypeSchema } from "#src/types.js";

export class ListTaskCommentsRoute implements Route {
  public constructor(private em: EntityManager) {}

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
        const task = await this.em.findOne(TaskEntity, { id });
        if (!task) {
          return reply.code(404).send(
            makeJsonApiError(404, "Not Found", {
              code: "TASK_NOT_FOUND",
              detail: `Task with id ${id} not found`,
            }),
          );
        }

        const items = await this.em
          .getRepository(CommentEntity)
          .findAll({ where: { taskId: id }, orderBy: { createdAt: "ASC" } });
        return reply.send({
          data: jsonApiSerializeManyComments(items),
          meta: { total: items.length },
        });
      },
    );
  }
}

export class AddTaskCommentRoute implements Route {
  public constructor(private em: EntityManager) {}

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
    const task = await this.em.findOne(TaskEntity, { id });
    if (!task) {
      return reply.code(404).send(
        makeJsonApiError(404, "Not Found", {
          code: "TASK_NOT_FOUND",
          detail: `Task with id ${id} not found`,
        }),
      );
    }

    const attrs = request.body.data.attributes;
    const comment = this.em.getRepository(CommentEntity).create({
      id: randomUUID(),
      taskId: id,
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

export class DeleteTaskCommentRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.delete(
      "/:id/comments/:commentId",
      {
        schema: {
          params: object({ id: string(), commentId: string() }),
          response: {
            204: makeSingleJsonApiTopDocument(literal(null)),
            404: jsonApiErrorDocumentSchema,
          },
        },
      },
      async (request, reply) => {
        const { id, commentId } = request.params as { id: string; commentId: string };
        const comment = await this.em
          .getRepository(CommentEntity)
          .findOne({ id: commentId, taskId: id });
        if (!comment) {
          return reply.code(404).send(
            makeJsonApiError(404, "Not Found", {
              code: "COMMENT_NOT_FOUND",
              detail: `Comment ${commentId} not found on task ${id}`,
            }),
          );
        }
        await this.em.remove(comment).flush();
        return reply.code(204).send({ data: null });
      },
    );
  }
}
