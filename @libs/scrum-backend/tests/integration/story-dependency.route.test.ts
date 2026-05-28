import { afterAll, aroundEach, beforeAll, expect, test } from "vitest";
import { randomUUID } from "crypto";
import { ScrumTestModule } from "#tests/utils/setup-module.js";
import { UserStoryEntity } from "#src/user-story/user-story.entity.js";
import { StoryDependencyEntity } from "#src/story-dependency/story-dependency.entity.js";

let module: ScrumTestModule;

beforeAll(async () => {
  module = await ScrumTestModule.init();
});

afterAll(async () => {
  await module.close();
});

aroundEach(async (runTest) => {
  await module.em.begin();
  await runTest();
  await module.em.rollback();
});

async function seedStory(projectId: string, overrides: Partial<{ id: string }> = {}) {
  const now = new Date();
  const id = overrides.id ?? randomUUID();
  await module.em.getRepository(UserStoryEntity).insert({
    id,
    title: "Story",
    description: "",
    notes: null,
    color: null,
    projectId,
    epicId: null,
    sprintId: null,
    status: "accepted",
    points: 3,
    priority: "Moyenne",
    rank: 0,
    value: null,
    createdById: null,
    tags: [],
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

async function seedDep(
  fromStoryId: string,
  toStoryId: string,
  type: "blocks" | "relates-to" = "blocks",
) {
  const now = new Date();
  const id = randomUUID();
  await module.em.getRepository(StoryDependencyEntity).insert({
    id,
    fromStoryId,
    toStoryId,
    type,
    createdAt: now,
  });
  return id;
}

test("GET /user-stories/:id/dependencies returns 404 unknown story", async () => {
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: "/user-stories/unknown/dependencies",
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(404);
  expect(response.json().errors[0].code).toBe("USER_STORY_NOT_FOUND");
});

test("GET /user-stories/:id/dependencies returns outgoing + incoming", async () => {
  const proj = "p-dep";
  const a = await seedStory(proj);
  const b = await seedStory(proj);
  const c = await seedStory(proj);
  await seedDep(a, b);
  await seedDep(c, a);

  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: `/user-stories/${a}/dependencies`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  const body = response.json();
  expect(body.data.outgoing).toHaveLength(1);
  expect(body.data.outgoing[0].attributes.toStoryId).toBe(b);
  expect(body.data.incoming).toHaveLength(1);
  expect(body.data.incoming[0].attributes.fromStoryId).toBe(c);
  expect(body.meta.total).toBe(2);
});

test("POST /user-stories/:id/dependencies creates successfully", async () => {
  const proj = "p-dep";
  const a = await seedStory(proj);
  const b = await seedStory(proj);
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: `/user-stories/${a}/dependencies`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { toStoryId: b, type: "blocks" } } },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.fromStoryId).toBe(a);
  expect(response.json().data.attributes.toStoryId).toBe(b);
  expect(response.json().data.attributes.type).toBe("blocks");
});

test("POST /user-stories/:id/dependencies self-dep -> 422 SELF_DEPENDENCY", async () => {
  const a = await seedStory("p");
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: `/user-stories/${a}/dependencies`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { toStoryId: a } } },
  });
  expect(response.statusCode).toBe(422);
  expect(response.json().errors[0].code).toBe("SELF_DEPENDENCY");
});

test("POST /user-stories/:id/dependencies cross-project -> 422", async () => {
  const a = await seedStory("p1");
  const b = await seedStory("p2");
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: `/user-stories/${a}/dependencies`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { toStoryId: b } } },
  });
  expect(response.statusCode).toBe(422);
  expect(response.json().errors[0].code).toBe("CROSS_PROJECT_DEPENDENCY");
});

test("POST /user-stories/:id/dependencies cycle detection -> 422 CYCLE_DETECTED", async () => {
  const proj = "p";
  const a = await seedStory(proj);
  const b = await seedStory(proj);
  await seedDep(a, b, "blocks");
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: `/user-stories/${b}/dependencies`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { toStoryId: a, type: "blocks" } } },
  });
  expect(response.statusCode).toBe(422);
  expect(response.json().errors[0].code).toBe("CYCLE_DETECTED");
});

test("POST /user-stories/:id/dependencies duplicate -> 422 DUPLICATE_DEPENDENCY", async () => {
  const proj = "p";
  const a = await seedStory(proj);
  const b = await seedStory(proj);
  await seedDep(a, b, "blocks");
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: `/user-stories/${a}/dependencies`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { toStoryId: b, type: "blocks" } } },
  });
  expect(response.statusCode).toBe(422);
  expect(response.json().errors[0].code).toBe("DUPLICATE_DEPENDENCY");
});

test("POST /user-stories/:id/dependencies missing target -> 404 USER_STORY_NOT_FOUND", async () => {
  const a = await seedStory("p");
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: `/user-stories/${a}/dependencies`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { toStoryId: "ghost" } } },
  });
  expect(response.statusCode).toBe(404);
  expect(response.json().errors[0].code).toBe("USER_STORY_NOT_FOUND");
});

test("DELETE /story-dependencies/:id returns 204", async () => {
  const proj = "p";
  const a = await seedStory(proj);
  const b = await seedStory(proj);
  const depId = await seedDep(a, b);
  const response = await module.fastifyInstance.inject({
    method: "DELETE",
    url: `/story-dependencies/${depId}`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(204);
  expect(await module.em.count(StoryDependencyEntity, { id: depId })).toBe(0);
});

test("DELETE /story-dependencies/:id 404 when missing", async () => {
  const response = await module.fastifyInstance.inject({
    method: "DELETE",
    url: "/story-dependencies/unknown",
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(404);
  expect(response.json().errors[0].code).toBe("STORY_DEPENDENCY_NOT_FOUND");
});
