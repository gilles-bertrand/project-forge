import { afterAll, aroundEach, beforeAll, expect, test } from "vitest";
import { randomUUID } from "crypto";
import { TimeTrackingTestModule } from "#tests/utils/setup-module.js";
import { TimeEntryEntity } from "#src/entities/time-entry.entity.js";

let module: TimeTrackingTestModule;

beforeAll(async () => {
  module = await TimeTrackingTestModule.init();
});

afterAll(async () => {
  await module.close();
});

aroundEach(async (runTest) => {
  await module.em.begin();
  await runTest();
  await module.em.rollback();
});

async function seedEntry(
  overrides: Partial<{
    id: string;
    userId: string;
    projectId: string;
    taskId: string;
    hours: number;
    date: Date;
  }> = {},
) {
  const id = overrides.id ?? randomUUID();
  const now = new Date();
  await module.em.getRepository(TimeEntryEntity).insert({
    id,
    taskId: overrides.taskId ?? "task-X",
    userId: overrides.userId ?? TimeTrackingTestModule.TEST_USER_ID,
    projectId: overrides.projectId ?? "project-Y",
    hours: overrides.hours ?? 2,
    date: overrides.date ?? now,
    description: null,
    createdAt: now,
  });
  return id;
}

test("GET /time-entries returns 401 without token", async () => {
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: "/time-entries",
  });
  expect(response.statusCode).toBe(401);
});

test("GET /time-entries returns list + meta.totalHours", async () => {
  await seedEntry({ hours: 2.5 });
  await seedEntry({ hours: 1.5 });

  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: "/time-entries",
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  const body = response.json();
  expect(body.meta.total).toBe(2);
  expect(body.meta.totalHours).toBe(4);
});

test("GET /time-entries filter[projectId] narrows results", async () => {
  await seedEntry({ projectId: "p-1", hours: 3 });
  await seedEntry({ projectId: "p-2", hours: 1 });

  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: "/time-entries?filter[projectId]=p-1",
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().meta.total).toBe(1);
  expect(response.json().meta.totalHours).toBe(3);
});

test("GET /time-entries filter date.gte+date.lte (range)", async () => {
  await seedEntry({ date: new Date("2025-01-10T00:00:00Z"), hours: 1 });
  await seedEntry({ date: new Date("2025-01-20T00:00:00Z"), hours: 2 });
  await seedEntry({ date: new Date("2025-01-30T00:00:00Z"), hours: 4 });

  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: "/time-entries?filter[date.gte]=2025-01-15T00:00:00Z&filter[date.lte]=2025-01-25T00:00:00Z",
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().meta.total).toBe(1);
  expect(response.json().meta.totalHours).toBe(2);
});

test("GET /time-entries/:id 404 unknown", async () => {
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: "/time-entries/unknown",
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(404);
  expect(response.json().errors[0].code).toBe("TIME_ENTRY_NOT_FOUND");
});

test("POST /time-entries creates entry", async () => {
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: "/time-entries",
    headers: { authorization: module.generateBearerToken() },
    payload: {
      data: {
        attributes: {
          taskId: "task-A",
          userId: TimeTrackingTestModule.TEST_USER_ID,
          projectId: "project-B",
          hours: 2.5,
          date: "2025-01-20T09:00:00Z",
          description: "Démarrage",
        },
      },
    },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.hours).toBe(2.5);
  expect(response.json().data.attributes.description).toBe("Démarrage");
});

test("PATCH /time-entries/:id updates hours", async () => {
  const id = await seedEntry({ hours: 2 });
  const response = await module.fastifyInstance.inject({
    method: "PATCH",
    url: `/time-entries/${id}`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { hours: 3.5 } } },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.hours).toBe(3.5);
});

test("DELETE /time-entries/:id returns 204", async () => {
  const id = await seedEntry();
  const response = await module.fastifyInstance.inject({
    method: "DELETE",
    url: `/time-entries/${id}`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(204);
});
