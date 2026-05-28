import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityManager } from "@mikro-orm/core";
import { literal, object, string } from "zod";
import { AttachmentEntity } from "#src/task/attachment.entity.js";
import {
  jsonApiSerializeAttachment,
  SerializedAttachmentSchema,
} from "#src/task/attachment.serializer.js";
import {
  jsonApiErrorDocumentSchema,
  makeJsonApiError,
  makeSingleJsonApiTopDocument,
  type Route,
} from "@libs/backend-shared";

export class GetAttachmentRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/:id",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            200: makeSingleJsonApiTopDocument(SerializedAttachmentSchema),
            404: jsonApiErrorDocumentSchema,
          },
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const item = await this.em.getRepository(AttachmentEntity).findOne({ id });
        if (!item) {
          return reply.code(404).send(
            makeJsonApiError(404, "Not Found", {
              code: "ATTACHMENT_NOT_FOUND",
              detail: `Attachment ${id} not found`,
            }),
          );
        }
        return reply.send({ data: jsonApiSerializeAttachment(item) });
      },
    );
  }
}

export class DeleteAttachmentRoute implements Route {
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
        const item = await this.em.getRepository(AttachmentEntity).findOne({ id });
        if (!item) {
          return reply.code(404).send(
            makeJsonApiError(404, "Not Found", {
              code: "ATTACHMENT_NOT_FOUND",
              detail: `Attachment ${id} not found`,
            }),
          );
        }
        await this.em.remove(item).flush();
        return reply.code(204).send({ data: null });
      },
    );
  }
}
