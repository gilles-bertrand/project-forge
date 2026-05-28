import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityManager } from "@mikro-orm/core";
import { literal, object, string } from "zod";
import { CommentEntity } from "#src/task/comment.entity.js";
import {
  jsonApiSerializeComment,
  SerializedCommentSchema,
} from "#src/task/comment.serializer.js";
import {
  jsonApiErrorDocumentSchema,
  makeJsonApiError,
  makeSingleJsonApiTopDocument,
  type Route,
} from "@libs/backend-shared";

export class GetCommentRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/:id",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            200: makeSingleJsonApiTopDocument(SerializedCommentSchema),
            404: jsonApiErrorDocumentSchema,
          },
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const comment = await this.em.getRepository(CommentEntity).findOne({ id });
        if (!comment) {
          return reply.code(404).send(
            makeJsonApiError(404, "Not Found", {
              code: "COMMENT_NOT_FOUND",
              detail: `Comment ${id} not found`,
            }),
          );
        }
        return reply.send({ data: jsonApiSerializeComment(comment) });
      },
    );
  }
}

export class DeleteCommentRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.delete(
      "/:id",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            204: makeSingleJsonApiTopDocument(literal(null)),
            404: jsonApiErrorDocumentSchema,
          },
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const comment = await this.em.getRepository(CommentEntity).findOne({ id });
        if (!comment) {
          return reply.code(404).send(
            makeJsonApiError(404, "Not Found", {
              code: "COMMENT_NOT_FOUND",
              detail: `Comment ${id} not found`,
            }),
          );
        }
        await this.em.remove(comment).flush();
        return reply.code(204).send({ data: null });
      },
    );
  }
}
