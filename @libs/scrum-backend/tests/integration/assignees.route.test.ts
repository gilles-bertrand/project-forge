import { afterAll, aroundEach, beforeAll, expect, test } from "vitest";
import { randomUUID } from "crypto";
import { ScrumTestModule } from "#tests/utils/setup-module.js";
import { TaskEntity } from "#src/task/task.entity.js";
import { ProjectMemberEntity } from "#src/project/project-member.entity.js";
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

async function seedTask(projectId: string): Promise<string> {
  const now = new Date();
  const id = randomUUID();
  await module.em.getRepository(TaskEntity).insert({
    id,
    number: 1,
    title: "Task",
    description: "",
    status: "to-do",
    type: "feature",
    nature: "functional",
    priority: "Moyenne",
    points: 3,
    estimatedHours: null,
    remainingHours: null,
    tags: [],
    projectId,
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

async function seedMember(projectId: string, userId: string): Promise<void> {
  await module.em.getRepository(ProjectMemberEntity).insert({
    id: randomUUID(),
    projectId,
    userId,
    role: "Developer",
    joinedAt: new Date(),
  });
}

// T4 — l'assignation n'accepte que les membres du projet
test("POST /tasks/:id/assignees rejects a non-member with 422", async () => {
  const projectId = randomUUID();
  const taskId = await seedTask(projectId);
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: `/tasks/${taskId}/assignees`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { userId: "not-a-member" } } },
  });
  expect(response.statusCode).toBe(422);
  expect(response.json().errors[0].code).toBe("USER_NOT_PROJECT_MEMBER");
});

test("POST /tasks/:id/assignees assigns a project member (200)", async () => {
  const projectId = randomUUID();
  const userId = randomUUID();
  const taskId = await seedTask(projectId);
  await seedMember(projectId, userId);

  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: `/tasks/${taskId}/assignees`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { userId } } },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.userId).toBe(userId);
});

test("POST /tasks/:id/assignees duplicate assignment returns 409", async () => {
  const projectId = randomUUID();
  const userId = randomUUID();
  const taskId = await seedTask(projectId);
  await seedMember(projectId, userId);

  const first = await module.fastifyInstance.inject({
    method: "POST",
    url: `/tasks/${taskId}/assignees`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { userId } } },
  });
  expect(first.statusCode).toBe(200);

  const second = await module.fastifyInstance.inject({
    method: "POST",
    url: `/tasks/${taskId}/assignees`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { userId } } },
  });
  expect(second.statusCode).toBe(409);
  expect(second.json().errors[0].code).toBe("ASSIGNEE_ALREADY_EXISTS");
});

test("POST /tasks/:id/assignees 404 when task missing", async () => {
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: "/tasks/unknown/assignees",
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { userId: "x" } } },
  });
  expect(response.statusCode).toBe(404);
  expect(response.json().errors[0].code).toBe("TASK_NOT_FOUND");
});

// T5 — DELETE retire l'assigné
test("DELETE /tasks/:id/assignees/:userId removes the assignee (204)", async () => {
  const projectId = randomUUID();
  const userId = randomUUID();
  const taskId = await seedTask(projectId);
  await seedMember(projectId, userId);
  await module.fastifyInstance.inject({
    method: "POST",
    url: `/tasks/${taskId}/assignees`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { userId } } },
  });

  const del = await module.fastifyInstance.inject({
    method: "DELETE",
    url: `/tasks/${taskId}/assignees/${userId}`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(del.statusCode).toBe(204);
  expect(await module.em.count(TaskAssigneeEntity, { taskId, userId })).toBe(0);
});

test("DELETE /tasks/:id/assignees/:userId 404 when not assigned", async () => {
  const projectId = randomUUID();
  const taskId = await seedTask(projectId);
  const response = await module.fastifyInstance.inject({
    method: "DELETE",
    url: `/tasks/${taskId}/assignees/never-assigned`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(404);
  expect(response.json().errors[0].code).toBe("ASSIGNEE_NOT_FOUND");
});
