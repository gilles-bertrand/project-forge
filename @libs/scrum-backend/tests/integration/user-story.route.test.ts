import { afterAll, aroundEach, beforeAll, expect, test } from "vitest";
import { randomUUID } from "crypto";
import { ScrumTestModule } from "#tests/utils/setup-module.js";
import { UserStoryEntity } from "#src/user-story/user-story.entity.js";

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

async function seedUserStory(overrides: Partial<{ id: string; title: string }> = {}) {
  const now = new Date();
  const id = overrides.id ?? randomUUID();
  await module.em.getRepository(UserStoryEntity).insert({
    id,
    title: overrides.title ?? "Test US",
    description: "desc",
    projectId: "p-test",
    epicId: null,
    status: "todo",
    points: 3,
    priority: 1,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

test("GET /user-stories returns 401 without token", async () => {
  const response = await module.fastifyInstance.inject({ method: "GET", url: "/user-stories" });
  expect(response.statusCode).toBe(401);
});

test("GET /user-stories returns list", async () => {
  await seedUserStory({ title: "Story A" });
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: "/user-stories",
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().meta.total).toBeGreaterThanOrEqual(1);
});

test("GET /user-stories/:id 404 unknown", async () => {
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: "/user-stories/unknown",
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(404);
  expect(response.json().errors[0].code).toBe("USER_STORY_NOT_FOUND");
});

test("POST /user-stories creates with points", async () => {
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: "/user-stories",
    headers: { authorization: module.generateBearerToken() },
    payload: {
      data: {
        attributes: {
          title: "New Story",
          description: "d",
          projectId: "p1",
          status: "todo",
          points: 5,
          priority: 2,
        },
      },
    },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.points).toBe(5);
  expect(response.json().data.attributes.epicId).toBe(null);
});

test("PATCH /user-stories/:id updates points", async () => {
  const id = await seedUserStory();
  const response = await module.fastifyInstance.inject({
    method: "PATCH",
    url: `/user-stories/${id}`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { points: 8 } } },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.points).toBe(8);
});

test("DELETE /user-stories/:id returns 204", async () => {
  const id = await seedUserStory();
  const response = await module.fastifyInstance.inject({
    method: "DELETE",
    url: `/user-stories/${id}`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(204);
});
