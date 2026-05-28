import { afterAll, aroundEach, beforeAll, expect, test } from "vitest";
import { randomUUID } from "crypto";
import { ScrumTestModule } from "#tests/utils/setup-module.js";
import { TaskEntity } from "#src/task/task.entity.js";
import { ProjectTaskCounterEntity } from "#src/project/project-task-counter.entity.js";

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

async function seedTask(
  overrides: Partial<{ id: string; projectId: string; number: number }> = {},
) {
  const now = new Date();
  const id = overrides.id ?? randomUUID();
  await module.em.getRepository(TaskEntity).insert({
    id,
    number: overrides.number ?? 1001,
    title: "Test Task",
    description: "desc",
    status: "todo",
    type: "Backend",
    nature: "Feature",
    priority: "Moyenne",
    points: 3,
    estimatedHours: null,
    remainingHours: null,
    tags: [],
    projectId: overrides.projectId ?? "p-test",
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

const baseCreatePayload = (overrides: Record<string, unknown> = {}) => ({
  data: {
    attributes: {
      title: "New Task",
      description: "d",
      status: "todo",
      type: "Backend",
      nature: "Feature",
      priority: "Moyenne",
      points: 3,
      projectId: "p-auto-num",
      createdById: ScrumTestModule.TEST_USER_ID,
      ...overrides,
    },
  },
});

test("GET /tasks returns 401 without token", async () => {
  const response = await module.fastifyInstance.inject({ method: "GET", url: "/tasks" });
  expect(response.statusCode).toBe(401);
});

test("GET /tasks returns list", async () => {
  await seedTask();
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: "/tasks",
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().meta.total).toBeGreaterThanOrEqual(1);
});

test("GET /tasks/:id returns 404 unknown", async () => {
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: "/tasks/unknown",
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(404);
  expect(response.json().errors[0].code).toBe("TASK_NOT_FOUND");
});

test("POST /tasks auto-numbers (1001 if empty project)", async () => {
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: "/tasks",
    headers: { authorization: module.generateBearerToken() },
    payload: baseCreatePayload(),
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.number).toBe(1001);
});

test("POST /tasks: 2 creates in same project → consecutive numbers", async () => {
  await module.em
    .getRepository(ProjectTaskCounterEntity)
    .insert({ projectId: "p-seq", nextNumber: 1043 });
  const r1 = await module.fastifyInstance.inject({
    method: "POST",
    url: "/tasks",
    headers: { authorization: module.generateBearerToken() },
    payload: baseCreatePayload({ projectId: "p-seq" }),
  });
  const r2 = await module.fastifyInstance.inject({
    method: "POST",
    url: "/tasks",
    headers: { authorization: module.generateBearerToken() },
    payload: baseCreatePayload({ projectId: "p-seq" }),
  });
  expect(r1.statusCode).toBe(200);
  expect(r2.statusCode).toBe(200);
  expect(r1.json().data.attributes.number).toBe(1043);
  expect(r2.json().data.attributes.number).toBe(1044);
});

test("POST /tasks honours explicit number", async () => {
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: "/tasks",
    headers: { authorization: module.generateBearerToken() },
    payload: baseCreatePayload({ number: 9999, projectId: "p-explicit" }),
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.number).toBe(9999);
});

test("PATCH /tasks/:id updates status", async () => {
  const id = await seedTask();
  const response = await module.fastifyInstance.inject({
    method: "PATCH",
    url: `/tasks/${id}`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { status: "done" } } },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.status).toBe("done");
});

test("POST /tasks: remainingHours defaults to estimatedHours", async () => {
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: "/tasks",
    headers: { authorization: module.generateBearerToken() },
    payload: baseCreatePayload({ estimatedHours: 5, projectId: "p-rh-default" }),
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.estimatedHours).toBe(5);
  expect(response.json().data.attributes.remainingHours).toBe(5);
});

test("PATCH /tasks/:id status=done forces remainingHours=0", async () => {
  const id = await seedTask();
  const response = await module.fastifyInstance.inject({
    method: "PATCH",
    url: `/tasks/${id}`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { status: "done" } } },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.remainingHours).toBe(0);
});

test("PATCH /tasks/:id status=done + explicit remainingHours is respected", async () => {
  const id = await seedTask();
  const response = await module.fastifyInstance.inject({
    method: "PATCH",
    url: `/tasks/${id}`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { status: "done", remainingHours: 2.5 } } },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.remainingHours).toBe(2.5);
});

test("POST /tasks persists tags array", async () => {
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: "/tasks",
    headers: { authorization: module.generateBearerToken() },
    payload: baseCreatePayload({ projectId: "p-tags", tags: ["urgent", "frontend"] }),
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.tags).toEqual(["urgent", "frontend"]);
});

test("DELETE /tasks/:id returns 204", async () => {
  const id = await seedTask();
  const response = await module.fastifyInstance.inject({
    method: "DELETE",
    url: `/tasks/${id}`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(204);
});

test("POST /tasks/:id/comments creates", async () => {
  const id = await seedTask();
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: `/tasks/${id}/comments`,
    headers: { authorization: module.generateBearerToken() },
    payload: {
      data: {
        attributes: {
          userId: ScrumTestModule.TEST_USER_ID,
          content: "Hello",
          type: "comment",
        },
      },
    },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.content).toBe("Hello");
});

test("GET /tasks/:id/comments lists", async () => {
  const id = await seedTask();
  await module.fastifyInstance.inject({
    method: "POST",
    url: `/tasks/${id}/comments`,
    headers: { authorization: module.generateBearerToken() },
    payload: {
      data: { attributes: { userId: "u1", content: "c1", type: "comment" } },
    },
  });
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: `/tasks/${id}/comments`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().meta.total).toBe(1);
});

test("POST /tasks/:id/attachments adds", async () => {
  const id = await seedTask();
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: `/tasks/${id}/attachments`,
    headers: { authorization: module.generateBearerToken() },
    payload: {
      data: {
        attributes: {
          name: "doc.pdf",
          url: "https://x/y.pdf",
          mimeType: "application/pdf",
          sizeBytes: 2048,
          uploadedById: ScrumTestModule.TEST_USER_ID,
        },
      },
    },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.name).toBe("doc.pdf");
});

test("POST /tasks/:id/assignees → 409 on duplicate", async () => {
  const id = await seedTask();
  const r1 = await module.fastifyInstance.inject({
    method: "POST",
    url: `/tasks/${id}/assignees`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { userId: "user-z" } } },
  });
  expect(r1.statusCode).toBe(200);

  const r2 = await module.fastifyInstance.inject({
    method: "POST",
    url: `/tasks/${id}/assignees`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { userId: "user-z" } } },
  });
  expect(r2.statusCode).toBe(409);
  expect(r2.json().errors[0].code).toBe("ASSIGNEE_ALREADY_EXISTS");
});

test("GET /tasks/:id/history returns empty list for fresh task", async () => {
  const id = await seedTask();
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: `/tasks/${id}/history`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().meta.total).toBe(0);
});
