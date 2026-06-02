import { afterAll, aroundEach, beforeAll, expect, test } from "vitest";
import { randomUUID } from "crypto";
import { ScrumTestModule } from "#tests/utils/setup-module.js";
import { UserStoryEntity } from "#src/user-story/user-story.entity.js";
import { AcceptanceTestEntity } from "#src/acceptance-test/acceptance-test.entity.js";
import { TaskEntity } from "#src/task/task.entity.js";

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
    taskId: null,
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

async function seedTask(): Promise<string> {
  const now = new Date();
  const id = randomUUID();
  await module.em.getRepository(TaskEntity).insert({
    id,
    number: 1,
    title: "Task for AT",
    description: "",
    status: "to-do",
    type: "feature",
    nature: "functional",
    priority: "Moyenne",
    points: 3,
    estimatedHours: null,
    remainingHours: null,
    tags: [],
    projectId: "p-at",
    userStoryId: null,
    epicId: null,
    sprintId: null,
    createdById: ScrumTestModule.TEST_USER_ID,
    dueDate: null,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

async function seedTaskAT(
  taskId: string,
  overrides: Partial<{ rank: number; state: string }> = {},
) {
  const now = new Date();
  const id = randomUUID();
  await module.em.getRepository(AcceptanceTestEntity).insert({
    id,
    userStoryId: null,
    taskId,
    name: "Task AT",
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

// --- Critères d'acceptation task-scopés (Phase 1) ---

// T1 — POST /tasks/:id/acceptance-tests
test("POST /tasks/:id/acceptance-tests creates with taskId set and userStoryId null", async () => {
  const taskId = await seedTask();
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: `/tasks/${taskId}/acceptance-tests`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { name: "Critère task", description: "d" } } },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.taskId).toBe(taskId);
  expect(response.json().data.attributes.userStoryId).toBeNull();
  expect(response.json().data.attributes.state).toBe("to-check");
});

test("POST /tasks/:id/acceptance-tests 404 when task missing", async () => {
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: "/tasks/unknown/acceptance-tests",
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { name: "n", description: "d" } } },
  });
  expect(response.statusCode).toBe(404);
  expect(response.json().errors[0].code).toBe("TASK_NOT_FOUND");
});

// T2 — GET /tasks/:id/acceptance-tests ne renvoie que les critères de la task
test("GET /tasks/:id/acceptance-tests returns only this task's criteria, sorted by rank", async () => {
  const taskId = await seedTask();
  // un critère d'une autre story ne doit pas remonter
  const storyId = await seedStory();
  await seedAT(storyId, { rank: 0 });
  await seedTaskAT(taskId, { rank: 2 });
  await seedTaskAT(taskId, { rank: 0 });
  await seedTaskAT(taskId, { rank: 1 });

  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: `/tasks/${taskId}/acceptance-tests`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().meta.total).toBe(3);
  const ranks = response
    .json()
    .data.map((d: { attributes: { rank: number } }) => d.attributes.rank);
  expect(ranks).toEqual([0, 1, 2]);
  expect(
    response
      .json()
      .data.every((d: { attributes: { taskId: string } }) => d.attributes.taskId === taskId),
  ).toBe(true);
});

test("GET /tasks/:id/acceptance-tests 404 when task missing", async () => {
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: "/tasks/unknown/acceptance-tests",
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(404);
  expect(response.json().errors[0].code).toBe("TASK_NOT_FOUND");
});

// PATCH task-scopé (route by-id réutilisée) — bloquant selon le plan
test("PATCH /acceptance-tests/:id updates state of a task-scoped criterion", async () => {
  const taskId = await seedTask();
  const atId = await seedTaskAT(taskId);
  const response = await module.fastifyInstance.inject({
    method: "PATCH",
    url: `/acceptance-tests/${atId}`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { state: "success" } } },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.state).toBe("success");
  expect(response.json().data.attributes.taskId).toBe(taskId);
  expect(response.json().data.attributes.userStoryId).toBeNull();
});

// T3 — non-régression : la liste story reste inchangée malgré userStoryId nullable
test("GET /user-stories/:id/acceptance-tests still works after userStoryId became nullable", async () => {
  const storyId = await seedStory();
  await seedAT(storyId, { rank: 0 });
  await seedAT(storyId, { rank: 1 });
  // un critère task-scopé ne doit PAS apparaître dans la liste story
  const taskId = await seedTask();
  await seedTaskAT(taskId);

  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: `/user-stories/${storyId}/acceptance-tests`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().meta.total).toBe(2);
  expect(
    response
      .json()
      .data.every(
        (d: { attributes: { userStoryId: string } }) => d.attributes.userStoryId === storyId,
      ),
  ).toBe(true);
});
