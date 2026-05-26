import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityManager } from "@mikro-orm/core";
import { array, number, object, string, z } from "zod";
import { SprintEntity } from "#src/sprint/sprint.entity.js";
import { TaskEntity } from "#src/task/task.entity.js";
import { UserStoryEntity } from "#src/user-story/user-story.entity.js";
import { EpicEntity } from "#src/epic/epic.entity.js";
import {
  jsonApiErrorDocumentSchema,
  makeJsonApiError,
  makeSingleJsonApiTopDocument,
  type Route,
} from "@libs/backend-shared";

const KindSchema = z.enum(["epic", "story", "task"]);

type ItemRef = { type: string; id: string };
type ConflictRef = { type: string; id: string; fromSprintId: string | null };
type AddItemsResult = { added: ItemRef[]; conflicts: ConflictRef[] };

async function handleTask(
  em: EntityManager,
  sprintId: string,
  itemId: string,
): Promise<AddItemsResult | { error: Parameters<typeof makeJsonApiError> }> {
  const task = await em.findOne(TaskEntity, { id: itemId });
  if (!task) {
    return {
      error: [404, "Not Found", { code: "TASK_NOT_FOUND", detail: `Task ${itemId} not found` }],
    };
  }
  const conflicts: ConflictRef[] = [];
  if (task.sprintId && task.sprintId !== sprintId) {
    conflicts.push({ type: "task", id: itemId, fromSprintId: task.sprintId });
  }
  task.sprintId = sprintId;
  return { added: [{ type: "task", id: itemId }], conflicts };
}

async function handleStory(
  em: EntityManager,
  sprintId: string,
  itemId: string,
): Promise<AddItemsResult | { error: Parameters<typeof makeJsonApiError> }> {
  const story = await em.findOne(UserStoryEntity, { id: itemId });
  if (!story) {
    return {
      error: [404, "Not Found", { code: "STORY_NOT_FOUND", detail: `Story ${itemId} not found` }],
    };
  }
  story.sprintId = sprintId;
  const added: ItemRef[] = [{ type: "story", id: itemId }];
  const conflicts: ConflictRef[] = [];
  const tasks = await em.find(TaskEntity, { userStoryId: itemId });
  for (const t of tasks) {
    if (t.sprintId && t.sprintId !== sprintId) {
      conflicts.push({ type: "task", id: t.id, fromSprintId: t.sprintId });
    }
    t.sprintId = sprintId;
    added.push({ type: "task", id: t.id });
  }
  return { added, conflicts };
}

async function handleEpic(
  em: EntityManager,
  sprintId: string,
  itemId: string,
): Promise<AddItemsResult | { error: Parameters<typeof makeJsonApiError> }> {
  const epic = await em.findOne(EpicEntity, { id: itemId });
  if (!epic) {
    return {
      error: [404, "Not Found", { code: "EPIC_NOT_FOUND", detail: `Epic ${itemId} not found` }],
    };
  }
  const stories = await em.find(UserStoryEntity, { epicId: itemId });
  const directTasks = await em.find(TaskEntity, { epicId: itemId, userStoryId: null });
  const storyTasks =
    stories.length > 0
      ? await em.find(TaskEntity, { userStoryId: { $in: stories.map((s) => s.id) } })
      : [];
  const allTasks = [...directTasks, ...storyTasks];
  const storiesWithTasks = new Set(storyTasks.map((t) => t.userStoryId).filter(Boolean));
  const storiesWithoutTasks = stories.filter((s) => !storiesWithTasks.has(s.id));
  const added: ItemRef[] = [];
  const conflicts: ConflictRef[] = [];
  for (const t of allTasks) {
    if (t.sprintId && t.sprintId !== sprintId) {
      conflicts.push({ type: "task", id: t.id, fromSprintId: t.sprintId });
    }
    t.sprintId = sprintId;
    added.push({ type: "task", id: t.id });
  }
  for (const s of storiesWithoutTasks) {
    s.sprintId = sprintId;
    added.push({ type: "story", id: s.id });
  }
  return { added, conflicts };
}

async function handleAddItems(
  em: EntityManager,
  sprintId: string,
  kind: z.infer<typeof KindSchema>,
  itemId: string,
): Promise<AddItemsResult | { error: Parameters<typeof makeJsonApiError> }> {
  if (kind === "task") return handleTask(em, sprintId, itemId);
  if (kind === "story") return handleStory(em, sprintId, itemId);
  return handleEpic(em, sprintId, itemId);
}

const SprintItemsResponseSchema = object({
  id: string(),
  type: z.literal("sprint-items"),
  attributes: object({
    added: array(object({ type: string(), id: string() })),
    conflicts: array(object({ type: string(), id: string(), fromSprintId: string().nullable() })),
  }),
});

export class AddSprintItemsRoute implements Route {
  public constructor(private em: EntityManager) {}

  // oxlint-disable-next-line max-lines-per-function
  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.post(
      "/:id/items",
      {
        schema: {
          params: object({ id: string() }),
          body: makeSingleJsonApiTopDocument(
            object({ attributes: object({ kind: KindSchema, id: string() }) }),
          ),
          response: {
            200: object({
              data: SprintItemsResponseSchema,
              meta: object({ addedCount: number().int(), conflictCount: number().int() }),
            }),
            404: jsonApiErrorDocumentSchema,
            409: jsonApiErrorDocumentSchema,
          },
        },
      },
      async (request, reply) => {
        const { id: sprintId } = request.params as { id: string };
        const { kind, id: itemId } = request.body.data.attributes;
        const sprint = await this.em.findOne(SprintEntity, { id: sprintId });
        if (!sprint) {
          return reply.code(404).send(
            makeJsonApiError(404, "Not Found", {
              code: "SPRINT_NOT_FOUND",
              detail: `Sprint with id ${sprintId} not found`,
            }),
          );
        }
        if (sprint.status === "completed") {
          return reply.code(409).send(
            makeJsonApiError(409, "Conflict", {
              code: "SPRINT_COMPLETED",
              detail: "Cannot add items to a completed sprint",
            }),
          );
        }
        const result = await handleAddItems(this.em, sprintId, kind, itemId);
        if ("error" in result) {
          return reply.code(result.error[0] as 404 | 409).send(makeJsonApiError(...result.error));
        }
        await this.em.flush();
        return reply.send({
          data: {
            id: sprintId,
            type: "sprint-items" as const,
            attributes: { added: result.added, conflicts: result.conflicts },
          },
          meta: { addedCount: result.added.length, conflictCount: result.conflicts.length },
        });
      },
    );
  }
}
