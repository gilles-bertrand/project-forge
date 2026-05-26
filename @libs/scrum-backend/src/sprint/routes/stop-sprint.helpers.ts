import type { EntityManager } from "@mikro-orm/core";
import { randomUUID } from "crypto";
import { SprintEntity } from "#src/sprint/sprint.entity.js";
import { TaskEntity } from "#src/task/task.entity.js";
import { UserStoryEntity } from "#src/user-story/user-story.entity.js";
import { makeJsonApiError } from "@libs/backend-shared";

export type ResolveResult = {
  targetSprintId: string | null;
  error?: Parameters<typeof makeJsonApiError>;
};
type SprintRef = { id: string; projectId: string };
export type StopAttributes = { action?: string; targetSprintId?: string };

export async function recomputeCompletedPoints(
  em: EntityManager,
  sprintId: string,
): Promise<number> {
  const tasks = await em.find(TaskEntity, { sprintId });
  const storyIds = Array.from(
    new Set(tasks.map((t) => t.userStoryId).filter((v): v is string => v !== null)),
  );
  if (storyIds.length === 0) return 0;
  const stories = await em.find(UserStoryEntity, { id: { $in: storyIds }, status: "done" });
  return stories.reduce((acc, s) => acc + s.points, 0);
}

export async function getUnfinishedItems(em: EntityManager, sprintId: string) {
  const tasks = await em.find(TaskEntity, { sprintId, status: { $ne: "done" } });
  const stories = await em.find(UserStoryEntity, {
    sprintId,
    status: { $ne: "done" },
  });
  return { tasks, stories };
}

export async function transferUnfinished(
  em: EntityManager,
  sprintId: string,
  targetSprintId: string | null,
): Promise<void> {
  const { tasks, stories } = await getUnfinishedItems(em, sprintId);
  for (const task of tasks) {
    task.sprintId = targetSprintId;
  }
  for (const story of stories) {
    story.sprintId = targetSprintId;
  }
  await em.flush();
}

async function resolveExistingTarget(
  em: EntityManager,
  sprint: SprintRef,
  tid: string,
): Promise<ResolveResult> {
  const target = await em.findOne(SprintEntity, { id: tid, projectId: sprint.projectId });
  if (!target) {
    return {
      targetSprintId: null,
      error: [
        404,
        "Not Found",
        { code: "SPRINT_NOT_FOUND", detail: `Target sprint ${tid} not found` },
      ],
    };
  }
  if (target.status === "completed") {
    return {
      targetSprintId: null,
      error: [
        409,
        "Conflict",
        { code: "TARGET_SPRINT_COMPLETED", detail: `Target sprint ${tid} is already completed` },
      ],
    };
  }
  return { targetSprintId: tid };
}

async function createNextSprint(em: EntityManager, sprint: SprintRef): Promise<string> {
  // TODO: refactor via create-sprint helper when #src/sprint/utils/create-sprint.js is available
  const now = new Date();
  const nextSprint = em.getRepository(SprintEntity).create({
    id: randomUUID(),
    number: 0,
    name: "Sprint (auto)",
    goal: null,
    projectId: sprint.projectId,
    startDate: now,
    endDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
    status: "planned",
    velocityPoints: 0,
    completedPoints: 0,
  });
  await em.flush();
  return nextSprint.id;
}

export async function resolveTargetSprintId(
  em: EntityManager,
  sprint: SprintRef,
  action: string,
  attrs: StopAttributes | undefined,
): Promise<ResolveResult> {
  if (action === "send-to-backlog") return { targetSprintId: null };

  if (action === "move-to-existing") {
    const tid = attrs?.targetSprintId;
    if (!tid) {
      return {
        targetSprintId: null,
        error: [
          422,
          "Unprocessable Entity",
          {
            code: "TARGET_SPRINT_REQUIRED",
            detail: "targetSprintId is required for move-to-existing",
          },
        ],
      };
    }
    return resolveExistingTarget(em, sprint, tid);
  }

  if (action === "move-to-next") {
    return { targetSprintId: await createNextSprint(em, sprint) };
  }

  return { targetSprintId: null };
}
