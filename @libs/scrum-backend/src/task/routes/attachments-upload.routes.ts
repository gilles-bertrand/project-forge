import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityManager } from "@mikro-orm/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import { object, string } from "zod";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
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
import type { SatelliteOwnerType } from "#src/types.js";
import { ensureOwnerExists } from "#src/task/owner-resolver.js";

interface MultipartFile {
  filename: string;
  mimetype: string;
  toBuffer(): Promise<Buffer>;
}

interface MultipartRequest {
  file(): Promise<MultipartFile | undefined>;
}

interface AuthenticatedUser {
  id: string;
}

const UPLOADS_DIR = path.join(process.cwd(), "dist/uploads");
const PUBLIC_PREFIX = "/public";

/**
 * Multipart file upload: stores the binary on disk under `dist/uploads`
 * (served back by `@fastify/static` at `/public/*`) and persists an
 * Attachment row pointing to that URL. `uploadedById` is derived from the
 * authenticated user — never trusted from the client.
 */
export class UploadAttachmentByOwnerRoute implements Route {
  public constructor(
    private em: EntityManager,
    private ownerType: SatelliteOwnerType,
  ) {}

  private async handle(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = request.params;
    const exists = await ensureOwnerExists(this.em, this.ownerType, id);
    if (!exists.ok) {
      return reply
        .code(404)
        .send(makeJsonApiError(404, "Not Found", { code: exists.code, detail: exists.detail }));
    }

    const uploadedById = (request as unknown as { user?: AuthenticatedUser | null }).user?.id;
    if (!uploadedById) {
      return reply.code(401).send(
        makeJsonApiError(401, "Unauthorized", {
          code: "ATTACHMENT_NO_USER",
          detail: "No authenticated user to attribute the upload to",
        }),
      );
    }

    const data = await (request as unknown as MultipartRequest).file();
    if (!data) {
      return reply.code(400).send(
        makeJsonApiError(400, "Bad Request", {
          code: "ATTACHMENT_NO_FILE",
          detail: "No file part found in the multipart request",
        }),
      );
    }

    const buffer = await data.toBuffer();
    const ext = path.extname(data.filename);
    const storedName = `${randomUUID()}${ext}`;
    await mkdir(UPLOADS_DIR, { recursive: true });
    await writeFile(path.join(UPLOADS_DIR, storedName), buffer);

    const item = this.em.getRepository(AttachmentEntity).create({
      id: randomUUID(),
      ownerType: this.ownerType,
      ownerId: id,
      name: data.filename,
      url: `${PUBLIC_PREFIX}/${storedName}`,
      mimeType: data.mimetype,
      sizeBytes: buffer.length,
      uploadedById,
    });
    await this.em.flush();
    return reply.send({ data: jsonApiSerializeAttachment(item) });
  }

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.post(
      "/:id/attachments/upload",
      {
        schema: {
          consumes: ["multipart/form-data"],
          params: object({ id: string() }),
          response: {
            200: makeSingleJsonApiTopDocument(SerializedAttachmentSchema),
            400: jsonApiErrorDocumentSchema,
            401: jsonApiErrorDocumentSchema,
            404: jsonApiErrorDocumentSchema,
          },
        },
      },
      (request, reply) => this.handle(request as never, reply),
    );
  }
}

export class UploadTaskAttachmentRoute extends UploadAttachmentByOwnerRoute {
  public constructor(em: EntityManager) {
    super(em, "task");
  }
}
