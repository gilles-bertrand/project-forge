import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityManager } from "@mikro-orm/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import { array, number, object, string } from "zod";
import { randomUUID } from "crypto";
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
import type { SatelliteOwnerType } from "#src/types.js";
import { ensureOwnerExists } from "#src/task/owner-resolver.js";

export class ListAttachmentsByOwnerRoute implements Route {
  public constructor(
    private em: EntityManager,
    private ownerType: SatelliteOwnerType,
  ) {}

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
        const exists = await ensureOwnerExists(this.em, this.ownerType, id);
        if (!exists.ok) {
          return reply
            .code(404)
            .send(makeJsonApiError(404, "Not Found", { code: exists.code, detail: exists.detail }));
        }

        const items = await this.em.getRepository(AttachmentEntity).findAll({
          where: { ownerType: this.ownerType, ownerId: id },
          orderBy: { createdAt: "DESC" },
        });
        return reply.send({
          data: jsonApiSerializeManyAttachments(items),
          meta: { total: items.length },
        });
      },
    );
  }
}

export class AddAttachmentByOwnerRoute implements Route {
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
            name: string;
            url: string;
            mimeType: string;
            sizeBytes: number;
            uploadedById: string;
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
    const item = this.em.getRepository(AttachmentEntity).create({
      id: randomUUID(),
      ownerType: this.ownerType,
      ownerId: id,
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

// Legacy aliases preserved for backward compatibility with existing routes
export class ListTaskAttachmentsRoute extends ListAttachmentsByOwnerRoute {
  public constructor(em: EntityManager) {
    super(em, "task");
  }
}

export class AddTaskAttachmentRoute extends AddAttachmentByOwnerRoute {
  public constructor(em: EntityManager) {
    super(em, "task");
  }
}

export {
  GetAttachmentRoute,
  DeleteAttachmentRoute,
} from "#src/task/routes/attachments-flat.routes.js";

export {
  UploadAttachmentByOwnerRoute,
  UploadTaskAttachmentRoute,
} from "#src/task/routes/attachments-upload.routes.js";
