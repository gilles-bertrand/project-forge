import { afterAll, aroundEach, beforeAll, expect, test } from "vitest";
import { randomUUID } from "crypto";
import { ScrumTestModule } from "#tests/utils/setup-module.js";
import { UserStoryEntity } from "#src/user-story/user-story.entity.js";
import { AcceptanceTestEntity } from "#src/acceptance-test/acceptance-test.entity.js";

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

async function seedStory(): Promise<string> {
  const now = new Date();
  const id = randomUUID();
  await module.em.getRepository(UserStoryEntity).insert({
    id,
    title: "Story for AT",
    description: "",
    notes: null,
    color: null,
    projectId: "p-at",
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

async function seedAT(storyId: string, overrides: Partial<{ rank: number; state: string }> = {}) {
  const now = new Date();
  const id = randomUUID();
  await module.em.getRepository(AcceptanceTestEntity).insert({
    id,
    userStoryId: storyId,
    name: "AT",
    description: "d",
    state: overrides.state ?? "to-check",
    rank: overrides.rank ?? 0,
    createdById: null,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

test("GET /user-stories/:id/acceptance-tests returns 404 when story missing", async () => {
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: "/user-stories/unknown/acceptance-tests",
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(404);
  expect(response.json().errors[0].code).toBe("USER_STORY_NOT_FOUND");
});

test("GET /user-stories/:id/acceptance-tests returns sorted by rank ASC", async () => {
  const storyId = await seedStory();
  await seedAT(storyId, { rank: 2 });
  await seedAT(storyId, { rank: 0 });
  await seedAT(storyId, { rank: 1 });

  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: `/user-stories/${storyId}/acceptance-tests`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  const ranks = response
    .json()
    .data.map((d: { attributes: { rank: number } }) => d.attributes.rank);
  expect(ranks).toEqual([0, 1, 2]);
  expect(response.json().meta.total).toBe(3);
});

test("POST /user-stories/:id/acceptance-tests creates with defaults", async () => {
  const storyId = await seedStory();
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: `/user-stories/${storyId}/acceptance-tests`,
    headers: { authorization: module.generateBearerToken() },
    payload: {
      data: {
        attributes: { name: "Critère 1", description: "test description" },
      },
    },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.state).toBe("to-check");
  expect(response.json().data.attributes.rank).toBe(0);
  expect(response.json().data.attributes.userStoryId).toBe(storyId);
});

test("POST /user-stories/:id/acceptance-tests 404 when story missing", async () => {
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: "/user-stories/unknown/acceptance-tests",
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { name: "n", description: "d" } } },
  });
  expect(response.statusCode).toBe(404);
  expect(response.json().errors[0].code).toBe("USER_STORY_NOT_FOUND");
});

test("PATCH /acceptance-tests/:id updates state", async () => {
  const storyId = await seedStory();
  const atId = await seedAT(storyId);
  const response = await module.fastifyInstance.inject({
    method: "PATCH",
    url: `/acceptance-tests/${atId}`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { state: "success" } } },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.state).toBe("success");
});

test("PATCH /acceptance-tests/:id 404 unknown", async () => {
  const response = await module.fastifyInstance.inject({
    method: "PATCH",
    url: "/acceptance-tests/unknown",
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { state: "success" } } },
  });
  expect(response.statusCode).toBe(404);
  expect(response.json().errors[0].code).toBe("ACCEPTANCE_TEST_NOT_FOUND");
});

test("DELETE /acceptance-tests/:id returns 204", async () => {
  const storyId = await seedStory();
  const atId = await seedAT(storyId);
  const response = await module.fastifyInstance.inject({
    method: "DELETE",
    url: `/acceptance-tests/${atId}`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(204);
  expect(await module.em.count(AcceptanceTestEntity, { id: atId })).toBe(0);
});

test("DELETE /acceptance-tests/:id 404 when missing", async () => {
  const response = await module.fastifyInstance.inject({
    method: "DELETE",
    url: "/acceptance-tests/unknown",
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(404);
  expect(response.json().errors[0].code).toBe("ACCEPTANCE_TEST_NOT_FOUND");
});

test("GET /user-stories/:id/acceptance-tests-summary returns aggregate state", async () => {
  const storyId = await seedStory();
  await seedAT(storyId, { state: "success" });
  await seedAT(storyId, { state: "failed" });

  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: `/user-stories/${storyId}/acceptance-tests-summary`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.state).toBe("has-failed");
});

test("GET /user-stories/:id/acceptance-tests-summary 'none' when empty", async () => {
  const storyId = await seedStory();
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: `/user-stories/${storyId}/acceptance-tests-summary`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.state).toBe("none");
});
