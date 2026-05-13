import { afterAll, aroundEach, beforeAll, expect, test } from "vitest";
import { randomUUID } from "crypto";
import { ScrumTestModule } from "#tests/utils/setup-module.js";
import { EpicEntity } from "#src/epic/epic.entity.js";

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

async function seedEpic(overrides: Partial<{ id: string; title: string; status: string }> = {}) {
  const now = new Date();
  const id = overrides.id ?? randomUUID();
  await module.em.getRepository(EpicEntity).insert({
    id,
    title: overrides.title ?? "Test Epic",
    description: "desc",
    projectId: "p-test",
    status: overrides.status ?? "todo",
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

test("GET /epics returns 401 without token", async () => {
  const response = await module.fastifyInstance.inject({ method: "GET", url: "/epics" });
  expect(response.statusCode).toBe(401);
});

test("GET /epics returns list with auth", async () => {
  await seedEpic({ title: "A" });
  await seedEpic({ title: "B" });
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: "/epics",
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().meta.total).toBeGreaterThanOrEqual(2);
});

test("GET /epics/:id returns 404 for unknown", async () => {
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: "/epics/unknown",
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(404);
  expect(response.json().errors[0].code).toBe("EPIC_NOT_FOUND");
});

test("POST /epics creates", async () => {
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: "/epics",
    headers: { authorization: module.generateBearerToken() },
    payload: {
      data: {
        attributes: {
          title: "Created Epic",
          description: "d",
          projectId: "p1",
          status: "in-progress",
        },
      },
    },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.title).toBe("Created Epic");
});

test("PATCH /epics/:id updates status", async () => {
  const id = await seedEpic({ status: "todo" });
  const response = await module.fastifyInstance.inject({
    method: "PATCH",
    url: `/epics/${id}`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { status: "done" } } },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.status).toBe("done");
});

test("DELETE /epics/:id returns 204", async () => {
  const id = await seedEpic();
  const response = await module.fastifyInstance.inject({
    method: "DELETE",
    url: `/epics/${id}`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(204);
});
