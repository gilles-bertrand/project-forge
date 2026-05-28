import { afterAll, aroundEach, beforeAll, expect, test } from "vitest";
import { randomUUID } from "crypto";
import { ScrumTestModule } from "#tests/utils/setup-module.js";
import { SprintEntity } from "#src/sprint/sprint.entity.js";
import { SprintBurndownSnapshotEntity } from "#src/sprint/sprint-burndown-snapshot.entity.js";

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

async function seedSprint(): Promise<string> {
  const id = randomUUID();
  const now = new Date();
  await module.em.getRepository(SprintEntity).insert({
    id,
    number: 1,
    name: "S1",
    goal: null,
    projectId: "p-burndown",
    startDate: new Date("2026-05-25T00:00:00Z"),
    endDate: new Date("2026-05-29T00:00:00Z"),
    status: "active",
    velocityPoints: 0,
    completedPoints: 0,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

async function seedSnapshot(
  sprintId: string,
  day: Date,
  remainingHours: number,
  taskCount: number,
) {
  await module.em.getRepository(SprintBurndownSnapshotEntity).insert({
    id: randomUUID(),
    sprintId,
    snapshotDate: day,
    remainingHoursTotal: remainingHours,
    remainingPointsTotal: 0,
    taskCount,
    createdAt: new Date(),
  });
}

test("GET /sprints/:id/burndown returns 401 without token", async () => {
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: "/sprints/unknown/burndown",
  });
  expect(response.statusCode).toBe(401);
});

test("GET /sprints/:id/burndown returns 404 on unknown sprint", async () => {
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: "/sprints/unknown/burndown",
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(404);
});

test("GET /sprints/:id/burndown returns actual + ideal with 2 snapshots", async () => {
  const sprintId = await seedSprint();
  await seedSnapshot(sprintId, new Date("2026-05-25T00:00:00Z"), 40, 8);
  await seedSnapshot(sprintId, new Date("2026-05-26T00:00:00Z"), 32, 7);

  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: `/sprints/${sprintId}/burndown`,
    headers: { authorization: module.generateBearerToken() },
  });

  expect(response.statusCode).toBe(200);
  const body = response.json();
  expect(body.meta.sprintId).toBe(sprintId);
  expect(body.data.type).toBe("sprint-burndowns");
  expect(Array.isArray(body.data.attributes.actual)).toBe(true);
  expect(body.data.attributes.actual).toHaveLength(2);
  expect(body.data.attributes.actual[0]).toMatchObject({
    day: "2026-05-25",
    remaining: 40,
    taskCount: 8,
  });
  expect(body.data.attributes.actual[1]).toMatchObject({
    day: "2026-05-26",
    remaining: 32,
    taskCount: 7,
  });
  expect(Array.isArray(body.data.attributes.ideal)).toBe(true);
  // Ideal line from initial (40) down to 0 over 4 days → 5 points
  expect(body.data.attributes.ideal).toHaveLength(5);
  expect(body.data.attributes.ideal[0]).toEqual({ day: "2026-05-25", remaining: 40 });
  expect(body.data.attributes.ideal[4]).toEqual({ day: "2026-05-29", remaining: 0 });
});

test("POST /sprints/:id/burndown-snapshot creates a snapshot", async () => {
  const sprintId = await seedSprint();
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: `/sprints/${sprintId}/burndown-snapshot`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.type).toBe("sprint-burndown-snapshots");
  expect(response.json().data.attributes.created).toBe(true);

  const count = await module.em.count(SprintBurndownSnapshotEntity, { sprintId });
  expect(count).toBe(1);
});
