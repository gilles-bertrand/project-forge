import { afterAll, aroundEach, beforeAll, expect, test } from "vitest";
import { randomUUID } from "crypto";
import { ScrumTestModule } from "#tests/utils/setup-module.js";
import { UserStoryEntity } from "#src/user-story/user-story.entity.js";
import { EpicEntity } from "#src/epic/epic.entity.js";
import { SprintEntity } from "#src/sprint/sprint.entity.js";

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

async function seedStory() {
  const id = randomUUID();
  const now = new Date();
  await module.em.getRepository(UserStoryEntity).insert({
    id,
    title: "S",
    description: "d",
    notes: null,
    color: null,
    projectId: "p-hist",
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

async function seedEpic() {
  const id = randomUUID();
  const now = new Date();
  await module.em.getRepository(EpicEntity).insert({
    id,
    title: "E",
    description: "d",
    notes: null,
    color: "#6B7280",
    type: "functional",
    value: null,
    rank: 0,
    projectId: "p-hist",
    createdById: null,
    status: "todo",
    tags: [],
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

async function seedSprint() {
  const id = randomUUID();
  const now = new Date();
  await module.em.getRepository(SprintEntity).insert({
    id,
    name: "Hist Sprint",
    goal: null,
    projectId: "p-hist-sprint",
    startDate: now,
    endDate: now,
    status: "planned",
    number: 1,
    velocityPoints: 0,
    completedPoints: 0,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

test("GET /user-stories/:id/history returns 404 for unknown", async () => {
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: "/user-stories/missing/history",
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(404);
  expect(response.json().errors[0].code).toBe("USER_STORY_NOT_FOUND");
});

test("GET /user-stories/:id/history returns entries after status change", async () => {
  const id = await seedStory();
  const patched = await module.fastifyInstance.inject({
    method: "PATCH",
    url: `/user-stories/${id}`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { status: "estimated" } } },
  });
  expect(patched.statusCode).toBe(200);

  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: `/user-stories/${id}/history`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  const body = response.json();
  expect(body.meta.total).toBeGreaterThanOrEqual(1);
  expect(body.data[0].attributes.ownerType).toBe("story");
});

test("GET /epics/:id/history returns 404 then list after status change", async () => {
  const id = await seedEpic();
  const r404 = await module.fastifyInstance.inject({
    method: "GET",
    url: "/epics/missing/history",
    headers: { authorization: module.generateBearerToken() },
  });
  expect(r404.statusCode).toBe(404);

  await module.fastifyInstance.inject({
    method: "PATCH",
    url: `/epics/${id}`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { status: "in-progress" } } },
  });
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: `/epics/${id}/history`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().meta.total).toBeGreaterThanOrEqual(1);
  expect(response.json().data[0].attributes.ownerType).toBe("epic");
});

test("GET /sprints/:id/history returns list after start", async () => {
  const id = await seedSprint();
  const started = await module.fastifyInstance.inject({
    method: "POST",
    url: `/sprints/${id}/start`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(started.statusCode).toBe(200);

  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: `/sprints/${id}/history`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().meta.total).toBeGreaterThanOrEqual(1);
  expect(response.json().data[0].attributes.ownerType).toBe("sprint");
});
