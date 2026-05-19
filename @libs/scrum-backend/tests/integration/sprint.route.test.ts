import { afterAll, aroundEach, beforeAll, expect, test } from "vitest";
import { randomUUID } from "crypto";
import { ScrumTestModule } from "#tests/utils/setup-module.js";
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

async function seedSprint(
  overrides: Partial<{ id: string; projectId: string; status: string; name: string }> = {},
) {
  const now = new Date();
  const id = overrides.id ?? randomUUID();
  await module.em.getRepository(SprintEntity).insert({
    id,
    name: overrides.name ?? "Sprint X",
    goal: null,
    projectId: overrides.projectId ?? "p-test",
    startDate: now,
    endDate: now,
    status: overrides.status ?? "planned",
    velocityPoints: 10,
    completedPoints: 0,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

test("GET /sprints returns 401 without token", async () => {
  const response = await module.fastifyInstance.inject({ method: "GET", url: "/sprints" });
  expect(response.statusCode).toBe(401);
});

test("GET /sprints returns list", async () => {
  await seedSprint({ name: "S1" });
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: "/sprints",
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().meta.total).toBeGreaterThanOrEqual(1);
});

test("GET /sprints/:id 404 unknown", async () => {
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: "/sprints/unknown",
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(404);
  expect(response.json().errors[0].code).toBe("SPRINT_NOT_FOUND");
});

test("POST /sprints creates", async () => {
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: "/sprints",
    headers: { authorization: module.generateBearerToken() },
    payload: {
      data: {
        attributes: {
          name: "Sprint 99",
          goal: "Goal X",
          projectId: "p1",
          startDate: "2025-02-01T00:00:00Z",
          endDate: "2025-02-14T00:00:00Z",
          status: "planned",
        },
      },
    },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.name).toBe("Sprint 99");
});

test("PATCH /sprints/:id updates goal", async () => {
  const id = await seedSprint();
  const response = await module.fastifyInstance.inject({
    method: "PATCH",
    url: `/sprints/${id}`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { goal: "New goal" } } },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.goal).toBe("New goal");
});

test("DELETE /sprints/:id returns 204", async () => {
  const id = await seedSprint();
  const response = await module.fastifyInstance.inject({
    method: "DELETE",
    url: `/sprints/${id}`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(204);
});

test("POST /sprints/:id/start: planned → active", async () => {
  const id = await seedSprint({ projectId: "p-start-1", status: "planned" });
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: `/sprints/${id}/start`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.status).toBe("active");
});

test("POST /sprints/:id/start: 409 if not planned", async () => {
  const id = await seedSprint({ projectId: "p-start-2", status: "completed" });
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: `/sprints/${id}/start`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(409);
  expect(response.json().errors[0].code).toBe("SPRINT_NOT_PLANNED");
});

test("POST /sprints/:id/start: 409 if another sprint already active for project", async () => {
  await seedSprint({ projectId: "p-start-3", status: "active" });
  const id = await seedSprint({ projectId: "p-start-3", status: "planned" });
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: `/sprints/${id}/start`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(409);
  expect(response.json().errors[0].code).toBe("ACTIVE_SPRINT_EXISTS");
});

test("POST /sprints/:id/stop: active → completed", async () => {
  const id = await seedSprint({ projectId: "p-stop-1", status: "active" });
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: `/sprints/${id}/stop`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.status).toBe("completed");
});

test("POST /sprints/:id/stop: 409 if not active", async () => {
  const id = await seedSprint({ projectId: "p-stop-2", status: "planned" });
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: `/sprints/${id}/stop`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(409);
  expect(response.json().errors[0].code).toBe("SPRINT_NOT_ACTIVE");
});
