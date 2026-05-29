import type { Route } from "@libs/backend-shared";
import type { EntityManager } from "@mikro-orm/core";
import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { SatelliteOwnerType } from "#src/types.js";
import {
  AddCommentByOwnerRoute,
  ListCommentsByOwnerRoute,
} from "#src/task/routes/comments.routes.js";
import {
  AddAttachmentByOwnerRoute,
  ListAttachmentsByOwnerRoute,
} from "#src/task/routes/attachments.routes.js";
import { UploadAttachmentByOwnerRoute } from "#src/task/routes/attachments-upload.routes.js";

/**
 * Returns the Comment+Attachment list/add/upload routes for a given owner type.
 * Used by mountProjects/mountEpics/mountUserStories to attach polymorphic
 * satellites without repeating the same route instantiations everywhere.
 */
export function satelliteRoutesFor(
  em: EntityManager,
  ownerType: SatelliteOwnerType,
): Route<FastifyInstanceTypeForModule>[] {
  return [
    new ListCommentsByOwnerRoute(em, ownerType),
    new AddCommentByOwnerRoute(em, ownerType),
    new ListAttachmentsByOwnerRoute(em, ownerType),
    new AddAttachmentByOwnerRoute(em, ownerType),
    new UploadAttachmentByOwnerRoute(em, ownerType),
  ];
}
