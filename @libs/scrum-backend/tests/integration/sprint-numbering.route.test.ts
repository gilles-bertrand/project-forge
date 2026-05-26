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

async function seedProject(
  overrides: Partial<{
    id: string;
    sprintDurationDays: number;
    defaultVelocityPoints: number;
  }> = {},
) {
  const now = new Date();
  const id = overrides.id ?? randomUUID();
  await module.em.getRepository(ProjectEntity).insert({
    id,
    name: "Test Project",
    description: "",
    status: "active",
    avatar: null,
    githubUrl: null,
    responsibleId: "test-user-id",
    createdById: "test-user-id",
    sprintDurationDays: overrides.sprintDurationDays ?? 14,
    defaultVelocityPoints: overrides.defaultVelocityPoints ?? 20,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

test("POST /sprints sans dates → numéro auto, dates dérivées de la config projet", async () => {
  const projectId = await seedProject({ sprintDurationDays: 10, defaultVelocityPoints: 25 });

  const res1 = await module.fastifyInstance.inject({
    method: "POST",
    url: "/sprints",
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { projectId } } },
  });
  expect(res1.statusCode).toBe(200);
  const s1 = res1.json().data.attributes;
  expect(s1.number).toBe(1);
  expect(s1.velocityPoints).toBe(25);

  const res2 = await module.fastifyInstance.inject({
    method: "POST",
    url: "/sprints",
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { projectId } } },
  });
  expect(res2.statusCode).toBe(200);
  const s2 = res2.json().data.attributes;
  expect(s2.number).toBe(2);

  const end1 = new Date(s1.endDate);
  const start2 = new Date(s2.startDate);
  const diffMs = start2.getTime() - end1.getTime();
  expect(diffMs).toBe(24 * 60 * 60 * 1000);
});

test("POST /sprints avec dates explicites → respecte les dates", async () => {
  const projectId = await seedProject();

  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: "/sprints",
    headers: { authorization: module.generateBearerToken() },
    payload: {
      data: {
        attributes: {
          projectId,
          startDate: "2025-03-01T00:00:00Z",
          endDate: "2025-03-21T00:00:00Z",
        },
      },
    },
  });
  expect(response.statusCode).toBe(200);
  const attrs = response.json().data.attributes;
  expect(new Date(attrs.startDate).toISOString()).toBe("2025-03-01T00:00:00.000Z");
  expect(new Date(attrs.endDate).toISOString()).toBe("2025-03-21T00:00:00.000Z");
});

test("POST /sprints sans nom → nom auto sprint-001", async () => {
  const projectId = await seedProject();

  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: "/sprints",
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { projectId } } },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.name).toBe("Sprint 001");
});
