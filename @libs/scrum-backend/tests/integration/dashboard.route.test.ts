import { afterAll, aroundEach, beforeAll, expect, test } from "vitest";
import { randomUUID } from "crypto";
import { ScrumTestModule } from "#tests/utils/setup-module.js";
import { TaskEntity } from "#src/task/task.entity.js";
import { TaskAssigneeEntity } from "#src/task/task-assignee.entity.js";

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

test("GET /dashboard returns 400 without params", async () => {
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: "/dashboard",
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(400);
  expect(response.json().errors[0].code).toBe("MISSING_PARAMS");
});

test("GET /dashboard 401 without token", async () => {
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: "/dashboard?projectId=p&sprintId=s",
  });
  expect(response.statusCode).toBe(401);
});

test("GET /dashboard aggregates tasks for project/sprint", async () => {
  const projectId = "p-dash";
  const sprintId = "s-dash";
  const now = new Date();

  const ids = [randomUUID(), randomUUID(), randomUUID()];
  await module.em.getRepository(TaskEntity).insertMany([
    {
      id: ids[0]!,
      number: 1001,
      title: "A",
      description: "d",
      status: "done",
      type: "Backend",
      nature: "Feature",
      priority: "Haute",
      points: 5,
      estimatedHours: null,
      projectId,
      userStoryId: null,
      epicId: null,
      sprintId,
      createdById: ScrumTestModule.TEST_USER_ID,
      dueDate: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ids[1]!,
      number: 1002,
      title: "B",
      description: "d",
      status: "in-progress",
      type: "Backend",
      nature: "Feature",
      priority: "Haute",
      points: 3,
      estimatedHours: null,
      projectId,
      userStoryId: null,
      epicId: null,
      sprintId,
      createdById: ScrumTestModule.TEST_USER_ID,
      dueDate: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ids[2]!,
      number: 1003,
      title: "C (other user)",
      description: "d",
      status: "todo",
      type: "Backend",
      nature: "Feature",
      priority: "Haute",
      points: 2,
      estimatedHours: null,
      projectId,
      userStoryId: null,
      epicId: null,
      sprintId,
      createdById: "user-other",
      dueDate: null,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  // Test user is assigned to task A
  await module.em.getRepository(TaskAssigneeEntity).insert({
    id: randomUUID(),
    taskId: ids[0]!,
    userId: ScrumTestModule.TEST_USER_ID,
    assignedAt: now,
  });

  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: `/dashboard?projectId=${projectId}&sprintId=${sprintId}`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  const attrs = response.json().data.attributes;
  expect(attrs.tasksTotal).toBe(3);
  expect(attrs.tasksCompleted).toBe(1);
  expect(attrs.pointsTotal).toBe(10);
  // myTasks: A (assigned) + B (createdBy test-user-id) = 2 tasks
  expect(attrs.myTasks.length).toBe(2);
  expect(attrs.hoursTotal).toBe(0); // pas de TimeEntry
});
