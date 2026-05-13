import { afterAll, aroundEach, beforeAll, expect, test } from "vitest";
import { randomUUID } from "crypto";
import { ScrumTestModule } from "#tests/utils/setup-module.js";
import { ProjectEntity } from "#src/project/project.entity.js";

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

test("GET /search?q= empty: returns empty", async () => {
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: "/search?q=",
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data).toEqual([]);
});

test("GET /search?q=Unique returns matching project", async () => {
  const now = new Date();
  await module.em.getRepository(ProjectEntity).insert({
    id: randomUUID(),
    name: "UniqueSearchToken",
    description: "d",
    status: "active",
    avatar: null,
    githubUrl: null,
    responsibleId: "u1",
    createdById: "u1",
    createdAt: now,
    updatedAt: now,
  });

  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: "/search?q=UniqueSearch&types=projects",
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  const body = response.json();
  expect(body.meta.total).toBeGreaterThanOrEqual(1);
  expect(body.data[0].type).toBe("projects");
});

test("GET /search returns 401 without token", async () => {
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: "/search?q=foo",
  });
  expect(response.statusCode).toBe(401);
});
