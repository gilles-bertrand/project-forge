import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityManager } from "@mikro-orm/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import { array, literal, number, object, string } from "zod";
import { randomUUID } from "crypto";
import { TaskEntity } from "#src/task/task.entity.js";
import { AttachmentEntity } from "#src/task/attachment.entity.js";
import {
  jsonApiSerializeAttachment,
  jsonApiSerializeManyAttachments,
  SerializedAttachmentSchema,
} from "#src/task/attachment.serializer.js";
import {
  jsonApiErrorDocumentSchema,
  makeJsonApiError,
  makeSingleJsonApiTopDocument,
  type Route,
} from "@libs/backend-shared";

export class ListTaskAttachmentsRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/:id/attachments",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            200: object({
              data: array(SerializedAttachmentSchema),
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
          .getRepository(AttachmentEntity)
          .findAll({ where: { taskId: id }, orderBy: { createdAt: "DESC" } });
        return reply.send({
          data: jsonApiSerializeManyAttachments(items),
          meta: { total: items.length },
        });
      },
    );
  }
}

export class AddTaskAttachmentRoute implements Route {
  public constructor(private em: EntityManager) {}

  private async handle(
    request: FastifyRequest<{
      Params: { id: string };
      Body: {
        data: {
          attributes: {
            name: string;
            url: string;
            mimeType: string;
            sizeBytes: number;
            uploadedById: string;
            projectId?: string | null;
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
    const item = this.em.getRepository(AttachmentEntity).create({
      id: randomUUID(),
      taskId: id,
      projectId: attrs.projectId ?? task.projectId,
      name: attrs.name,
      url: attrs.url,
      mimeType: attrs.mimeType,
      sizeBytes: attrs.sizeBytes,
      uploadedById: attrs.uploadedById,
    });
    await this.em.flush();
    return reply.send({ data: jsonApiSerializeAttachment(item) });
  }

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.post(
      "/:id/attachments",
      {
        schema: {
          params: object({ id: string() }),
          body: makeSingleJsonApiTopDocument(
            object({
              attributes: object({
                name: string(),
                url: string(),
                mimeType: string(),
                sizeBytes: number().int(),
                uploadedById: string(),
                projectId: string().nullable().optional(),
              }),
            }),
          ),
          response: {
            200: makeSingleJsonApiTopDocument(SerializedAttachmentSchema),
            404: jsonApiErrorDocumentSchema,
          },
        },
      },
      (request, reply) => this.handle(request as never, reply),
    );
  }
}

export class DeleteTaskAttachmentRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.delete(
      "/:id/attachments/:attachmentId",
      {
        schema: {
          params: object({ id: string(), attachmentId: string() }),
          response: {
            204: makeSingleJsonApiTopDocument(literal(null)),
            404: jsonApiErrorDocumentSchema,
          },
        },
      },
      async (request, reply) => {
        const { id, attachmentId } = request.params as {
          id: string;
          attachmentId: string;
        };
        const item = await this.em
          .getRepository(AttachmentEntity)
          .findOne({ id: attachmentId, taskId: id });
        if (!item) {
          return reply.code(404).send(
            makeJsonApiError(404, "Not Found", {
              code: "ATTACHMENT_NOT_FOUND",
              detail: `Attachment ${attachmentId} not found on task ${id}`,
            }),
          );
        }
        await this.em.remove(item).flush();
        return reply.code(204).send({ data: null });
      },
    );
  }
}
