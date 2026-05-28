import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityManager } from "@mikro-orm/core";
import { array, number, object, string } from "zod";
import { HistoryEntryEntity } from "#src/task/history-entry.entity.js";
import {
  jsonApiSerializeManyHistoryEntries,
  SerializedHistoryEntrySchema,
} from "#src/task/history-entry.serializer.js";
import { jsonApiErrorDocumentSchema, makeJsonApiError, type Route } from "@libs/backend-shared";
import { ensureOwnerExists, type AuditableOwnerType } from "#src/task/owner-resolver.js";

export class ListHistoryByOwnerRoute implements Route {
  public constructor(
    private em: EntityManager,
    private ownerType: AuditableOwnerType,
  ) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/:id/history",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            200: object({
              data: array(SerializedHistoryEntrySchema),
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

        const items = await this.em.getRepository(HistoryEntryEntity).findAll({
          where: { ownerType: this.ownerType, ownerId: id },
          orderBy: { createdAt: "DESC" },
        });
        return reply.send({
          data: jsonApiSerializeManyHistoryEntries(items),
          meta: { total: items.length },
        });
      },
    );
  }
}

// Legacy alias preserved for back-compat with mounters.ts and existing tests.
export class ListTaskHistoryRoute extends ListHistoryByOwnerRoute {
  public constructor(em: EntityManager) {
    super(em, "task");
  }
}
