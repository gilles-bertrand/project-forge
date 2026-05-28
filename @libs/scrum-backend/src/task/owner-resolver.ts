import type { EntityManager } from "@mikro-orm/core";
import { ProjectEntity } from "#src/project/project.entity.js";
import { EpicEntity } from "#src/epic/epic.entity.js";
import { UserStoryEntity } from "#src/user-story/user-story.entity.js";
import { TaskEntity } from "#src/task/task.entity.js";
import { SprintEntity } from "#src/sprint/sprint.entity.js";
import type { SatelliteOwnerType } from "#src/types.js";

export type AuditableOwnerType = SatelliteOwnerType | "sprint";

const OWNER_ENTITY_MAP = {
  task: { entity: TaskEntity, code: "TASK_NOT_FOUND" },
  story: { entity: UserStoryEntity, code: "USER_STORY_NOT_FOUND" },
  epic: { entity: EpicEntity, code: "EPIC_NOT_FOUND" },
  project: { entity: ProjectEntity, code: "PROJECT_NOT_FOUND" },
  sprint: { entity: SprintEntity, code: "SPRINT_NOT_FOUND" },
} as const;

export type EnsureOwnerResult =
  | { ok: true }
  | { ok: false; status: 404; code: string; detail: string };

export async function ensureOwnerExists(
  em: EntityManager,
  ownerType: AuditableOwnerType,
  ownerId: string,
): Promise<EnsureOwnerResult> {
  const config = OWNER_ENTITY_MAP[ownerType];
  // Cast required: union of heterogeneous EntitySchema types doesn't narrow to EntityName.
  const owner = await em.findOne(config.entity as unknown as typeof TaskEntity, {
    id: ownerId,
  });
  if (!owner) {
    return {
      ok: false,
      status: 404,
      code: config.code,
      detail: `${ownerType} with id ${ownerId} not found`,
    };
  }
  return { ok: true };
}
