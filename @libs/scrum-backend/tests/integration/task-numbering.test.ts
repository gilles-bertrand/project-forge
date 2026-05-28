import { afterAll, aroundEach, beforeAll, expect, test } from "vitest";
import { randomUUID } from "crypto";
import { ScrumTestModule } from "#tests/utils/setup-module.js";

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

const baseCreatePayload = (projectId: string) => ({
  data: {
    attributes: {
      title: "T",
      description: "d",
      status: "todo",
      type: "Backend",
      nature: "Feature",
      priority: "Moyenne",
      points: 1,
      projectId,
      createdById: ScrumTestModule.TEST_USER_ID,
    },
  },
});

test("POST /tasks 3 times in same project → 1001, 1002, 1003 (atomic counter)", async () => {
  const projectId = `proj-${randomUUID()}`;
  const headers = { authorization: module.generateBearerToken() };

  const r1 = await module.fastifyInstance.inject({
    method: "POST",
    url: "/tasks",
    headers,
    payload: baseCreatePayload(projectId),
  });
  const r2 = await module.fastifyInstance.inject({
    method: "POST",
    url: "/tasks",
    headers,
    payload: baseCreatePayload(projectId),
  });
  const r3 = await module.fastifyInstance.inject({
    method: "POST",
    url: "/tasks",
    headers,
    payload: baseCreatePayload(projectId),
  });

  expect(r1.statusCode).toBe(200);
  expect(r2.statusCode).toBe(200);
  expect(r3.statusCode).toBe(200);
  expect(r1.json().data.attributes.number).toBe(1001);
  expect(r2.json().data.attributes.number).toBe(1002);
  expect(r3.json().data.attributes.number).toBe(1003);
});
