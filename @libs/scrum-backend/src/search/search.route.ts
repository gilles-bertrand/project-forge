import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityManager } from "@mikro-orm/core";
import { any, array, number, object, string } from "zod";
import { ProjectEntity } from "#src/project/project.entity.js";
import { EpicEntity } from "#src/epic/epic.entity.js";
import { UserStoryEntity } from "#src/user-story/user-story.entity.js";
import { TaskEntity } from "#src/task/task.entity.js";
import { SprintEntity } from "#src/sprint/sprint.entity.js";
import { jsonApiSerializeProject } from "#src/project/project.serializer.js";
import { jsonApiSerializeEpic } from "#src/epic/epic.serializer.js";
import { jsonApiSerializeUserStory } from "#src/user-story/user-story.serializer.js";
import { jsonApiSerializeTask } from "#src/task/task.serializer.js";
import { jsonApiSerializeSprint } from "#src/sprint/sprint.serializer.js";
import type { Route } from "@libs/backend-shared";

const DEFAULT_TYPES = ["projects", "tasks", "user-stories", "epics", "sprints"];
const SEARCH_LIMIT = 10;

async function searchByType(em: EntityManager, type: string, q: string): Promise<unknown[]> {
  if (type === "projects") {
    const items = await em.find(
      ProjectEntity,
      { $or: [{ name: { $ilike: `%${q}%` } }, { description: { $ilike: `%${q}%` } }] },
      { limit: SEARCH_LIMIT },
    );
    return items.map(jsonApiSerializeProject);
  }
  if (type === "epics") {
    const items = await em.find(
      EpicEntity,
      { $or: [{ title: { $ilike: `%${q}%` } }, { description: { $ilike: `%${q}%` } }] },
      { limit: SEARCH_LIMIT },
    );
    return items.map(jsonApiSerializeEpic);
  }
  if (type === "user-stories") {
    const items = await em.find(
      UserStoryEntity,
      { $or: [{ title: { $ilike: `%${q}%` } }, { description: { $ilike: `%${q}%` } }] },
      { limit: SEARCH_LIMIT },
    );
    return items.map(jsonApiSerializeUserStory);
  }
  if (type === "tasks") {
    const items = await em.find(
      TaskEntity,
      { $or: [{ title: { $ilike: `%${q}%` } }, { description: { $ilike: `%${q}%` } }] },
      { limit: SEARCH_LIMIT },
    );
    return items.map(jsonApiSerializeTask);
  }
  if (type === "sprints") {
    const items = await em.find(
      SprintEntity,
      { $or: [{ name: { $ilike: `%${q}%` } }, { goal: { $ilike: `%${q}%` } }] },
      { limit: SEARCH_LIMIT },
    );
    return items.map(jsonApiSerializeSprint);
  }
  return [];
}

export class SearchRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/",
      {
        schema: {
          querystring: object({
            q: string().optional(),
            types: string().optional(),
          }),
          response: {
            200: object({
              data: array(any()),
              meta: object({ total: number() }),
            }),
          },
        },
      },
      async (request, reply) => {
        const q = String(request.query.q ?? "").trim();
        if (q.length < 2) return reply.send({ data: [], meta: { total: 0 } });

        const types = (request.query.types ?? DEFAULT_TYPES.join(",")).split(",");
        const results: unknown[] = [];
        for (const t of types) {
          results.push(...(await searchByType(this.em, t, q)));
        }

        return reply.send({ data: results, meta: { total: results.length } });
      },
    );
  }
}
