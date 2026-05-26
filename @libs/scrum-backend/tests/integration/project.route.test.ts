import { afterAll, aroundEach, beforeAll, expect, test } from "vitest";
import { randomUUID } from "crypto";
import { ScrumTestModule, StubTimeTrackingPort } from "#tests/utils/setup-module.js";
import { ProjectEntity } from "#src/project/project.entity.js";
import { EpicEntity } from "#src/epic/epic.entity.js";
import { UserStoryEntity } from "#src/user-story/user-story.entity.js";
import { SprintEntity } from "#src/sprint/sprint.entity.js";
import { TaskEntity } from "#src/task/task.entity.js";
import { TaskAssigneeEntity } from "#src/task/task-assignee.entity.js";
import { CommentEntity } from "#src/task/comment.entity.js";
import { AttachmentEntity } from "#src/task/attachment.entity.js";
import { HistoryEntryEntity } from "#src/task/history-entry.entity.js";
import { ProjectMemberEntity } from "#src/project/project-member.entity.js";

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

async function seedProject(overrides: Partial<{ id: string; name: string; status: string }> = {}) {
  const now = new Date();
  const id = overrides.id ?? randomUUID();
  await module.em.getRepository(ProjectEntity).insert({
    id,
    name: overrides.name ?? "Test Project",
    description: "desc",
    status: overrides.status ?? "active",
    avatar: null,
    githubUrl: null,
    responsibleId: ScrumTestModule.TEST_USER_ID,
    createdById: ScrumTestModule.TEST_USER_ID,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

test("GET /projects returns 401 without token", async () => {
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: "/projects",
  });
  expect(response.statusCode).toBe(401);
});

test("GET /projects returns list with auth", async () => {
  await seedProject({ name: "Alpha" });
  await seedProject({ name: "Beta" });

  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: "/projects",
    headers: { authorization: module.generateBearerToken() },
  });

  expect(response.statusCode).toBe(200);
  const body = response.json();
  expect(body.meta.total).toBeGreaterThanOrEqual(2);
  expect(Array.isArray(body.data)).toBe(true);
});

test("GET /projects/:id returns 404 for unknown id", async () => {
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: "/projects/unknown-id",
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(404);
  expect(response.json().errors[0].code).toBe("PROJECT_NOT_FOUND");
});

test("GET /projects/:id returns 200 for existing", async () => {
  const id = await seedProject({ name: "Specific" });
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: `/projects/${id}`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.name).toBe("Specific");
});

test("POST /projects creates a project", async () => {
  const newId = randomUUID();
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: "/projects",
    headers: { authorization: module.generateBearerToken() },
    payload: {
      data: {
        id: newId,
        attributes: {
          name: "Created",
          description: "Created desc",
          status: "planned",
          responsibleId: ScrumTestModule.TEST_USER_ID,
          createdById: ScrumTestModule.TEST_USER_ID,
        },
      },
    },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.name).toBe("Created");
  expect(response.json().data.id).toBe(newId);
});

test("PATCH /projects/:id updates status", async () => {
  const id = await seedProject({ status: "planned" });
  const response = await module.fastifyInstance.inject({
    method: "PATCH",
    url: `/projects/${id}`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { status: "active" } } },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.status).toBe("active");
});

test("DELETE /projects/:id returns 204 when empty", async () => {
  const id = await seedProject();
  const response = await module.fastifyInstance.inject({
    method: "DELETE",
    url: `/projects/${id}`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(204);
});

test("DELETE /projects/:id cascades and returns 204 when project has children", async () => {
  const now = new Date();
  const id = await seedProject();

  const epicId = randomUUID();
  await module.em.getRepository(EpicEntity).insert({
    id: epicId,
    title: "Epic",
    description: "desc",
    projectId: id,
    status: "todo",
    createdAt: now,
    updatedAt: now,
  });

  const userStoryId = randomUUID();
  await module.em.getRepository(UserStoryEntity).insert({
    id: userStoryId,
    title: "US",
    description: "desc",
    projectId: id,
    epicId,
    status: "todo",
    points: 3,
    priority: 1,
    createdAt: now,
    updatedAt: now,
  });

  const sprintId = randomUUID();
  await module.em.getRepository(SprintEntity).insert({
    id: sprintId,
    name: "Sprint 1",
    goal: null,
    projectId: id,
    startDate: now,
    endDate: now,
    status: "planned",
    velocityPoints: 0,
    completedPoints: 0,
    createdAt: now,
    updatedAt: now,
  });

  const taskId = randomUUID();
  await module.em.getRepository(TaskEntity).insert({
    id: taskId,
    number: 1,
    title: "Task",
    description: "desc",
    status: "todo",
    type: "task",
    nature: "feature",
    priority: "medium",
    points: 2,
    estimatedHours: null,
    projectId: id,
    userStoryId,
    epicId,
    sprintId,
    createdById: ScrumTestModule.TEST_USER_ID,
    dueDate: null,
    createdAt: now,
    updatedAt: now,
  });

  await module.em.getRepository(TaskAssigneeEntity).insert({
    id: randomUUID(),
    taskId,
    userId: ScrumTestModule.TEST_USER_ID,
    assignedAt: now,
  });

  await module.em.getRepository(CommentEntity).insert({
    id: randomUUID(),
    taskId,
    userId: ScrumTestModule.TEST_USER_ID,
    content: "comment",
    type: "text",
    metadata: null,
    createdAt: now,
  });

  await module.em.getRepository(AttachmentEntity).insert({
    id: randomUUID(),
    taskId,
    projectId: null,
    name: "file.txt",
    url: "https://example.com/file.txt",
    mimeType: "text/plain",
    sizeBytes: 42,
    uploadedById: ScrumTestModule.TEST_USER_ID,
    createdAt: now,
  });

  await module.em.getRepository(HistoryEntryEntity).insert({
    id: randomUUID(),
    ownerType: "Task",
    ownerId: taskId,
    type: "created",
    description: "Task created",
    userId: ScrumTestModule.TEST_USER_ID,
    metadata: null,
    createdAt: now,
  });

  await module.em.getRepository(ProjectMemberEntity).insert({
    id: randomUUID(),
    projectId: id,
    userId: "member-user-id",
    role: "member",
    joinedAt: now,
  });

  const response = await module.fastifyInstance.inject({
    method: "DELETE",
    url: `/projects/${id}`,
    headers: { authorization: module.generateBearerToken() },
  });

  expect(response.statusCode).toBe(204);

  expect(await module.em.count(ProjectEntity, { id })).toBe(0);
  expect(await module.em.count(EpicEntity, { projectId: id })).toBe(0);
  expect(await module.em.count(UserStoryEntity, { projectId: id })).toBe(0);
  expect(await module.em.count(SprintEntity, { projectId: id })).toBe(0);
  expect(await module.em.count(TaskEntity, { projectId: id })).toBe(0);
  expect(await module.em.count(TaskAssigneeEntity, { taskId })).toBe(0);
  expect(await module.em.count(CommentEntity, { taskId })).toBe(0);
  expect(await module.em.count(AttachmentEntity, { taskId })).toBe(0);
  expect(await module.em.count(HistoryEntryEntity, { ownerId: taskId })).toBe(0);
  expect(await module.em.count(ProjectMemberEntity, { projectId: id })).toBe(0);
});

test("DELETE /projects/:id rolls back when timeTrackingPort throws", async () => {
  const throwingPort = new StubTimeTrackingPort(0, async () => {
    throw new Error("simulated time-tracking failure");
  });
  const rollbackModule = await ScrumTestModule.init(throwingPort);

  const now = new Date();
  const id = randomUUID();
  await rollbackModule.em.begin();
  try {
    await rollbackModule.em.getRepository(ProjectEntity).insert({
      id,
      name: "Rollback Project",
      description: "desc",
      status: "active",
      avatar: null,
      githubUrl: null,
      responsibleId: ScrumTestModule.TEST_USER_ID,
      createdById: ScrumTestModule.TEST_USER_ID,
      createdAt: now,
      updatedAt: now,
    });

    const response = await rollbackModule.fastifyInstance.inject({
      method: "DELETE",
      url: `/projects/${id}`,
      headers: { authorization: rollbackModule.generateBearerToken() },
    });

    expect(response.statusCode).toBe(500);
    expect(await rollbackModule.em.count(ProjectEntity, { id })).toBe(1);
  } finally {
    await rollbackModule.em.rollback();
    await rollbackModule.close();
  }
});

test("DELETE /projects/:id returns 404 on second call (idempotence)", async () => {
  const id = await seedProject();

  const first = await module.fastifyInstance.inject({
    method: "DELETE",
    url: `/projects/${id}`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(first.statusCode).toBe(204);

  const second = await module.fastifyInstance.inject({
    method: "DELETE",
    url: `/projects/${id}`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(second.statusCode).toBe(404);
  expect(second.json().errors[0].code).toBe("PROJECT_NOT_FOUND");
});

test("POST /projects/:id/members adds a member then 409 on duplicate", async () => {
  const id = await seedProject();
  const first = await module.fastifyInstance.inject({
    method: "POST",
    url: `/projects/${id}/members`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { userId: "user-x", role: "member" } } },
  });
  expect(first.statusCode).toBe(200);
  expect(first.json().data.attributes.userId).toBe("user-x");

  const second = await module.fastifyInstance.inject({
    method: "POST",
    url: `/projects/${id}/members`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { userId: "user-x", role: "member" } } },
  });
  expect(second.statusCode).toBe(409);
  expect(second.json().errors[0].code).toBe("MEMBER_ALREADY_EXISTS");
});

test("DELETE /projects/:id/members/:userId removes", async () => {
  const id = await seedProject();
  await module.fastifyInstance.inject({
    method: "POST",
    url: `/projects/${id}/members`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { userId: "user-y", role: "owner" } } },
  });

  const response = await module.fastifyInstance.inject({
    method: "DELETE",
    url: `/projects/${id}/members/user-y`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(204);
});

test("GET /projects/:id/stats returns 404 for unknown project", async () => {
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: "/projects/no-such-id/stats",
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(404);
  expect(response.json().errors[0].code).toBe("PROJECT_NOT_FOUND");
});

test("GET /projects/:id/stats returns correct aggregated counters", async () => {
  const now = new Date();
  const id = await seedProject();

  // 2 epics: 1 done
  const epicDoneId = randomUUID();
  const epicTodoId = randomUUID();
  await module.em
    .getRepository(EpicEntity)
    .insert({
      id: epicDoneId,
      title: "E1",
      description: "",
      projectId: id,
      status: "done",
      createdAt: now,
      updatedAt: now,
    });
  await module.em
    .getRepository(EpicEntity)
    .insert({
      id: epicTodoId,
      title: "E2",
      description: "",
      projectId: id,
      status: "todo",
      createdAt: now,
      updatedAt: now,
    });

  // 5 user stories: 2 done
  const storyIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  for (const [i, sid] of storyIds.entries()) {
    await module.em.getRepository(UserStoryEntity).insert({
      id: sid,
      title: `S${String(i)}`,
      description: "",
      projectId: id,
      epicId: null,
      status: i < 2 ? "done" : "todo",
      points: 1,
      priority: i,
      createdAt: now,
      updatedAt: now,
    });
  }

  // 8 tasks: 3 done
  for (let i = 0; i < 8; i++) {
    await module.em.getRepository(TaskEntity).insert({
      id: randomUUID(),
      number: 1000 + i,
      title: `T${String(i)}`,
      description: "",
      status: i < 3 ? "done" : "todo",
      type: "Frontend",
      nature: "Feature",
      priority: "medium",
      points: 1,
      estimatedHours: null,
      projectId: id,
      userStoryId: null,
      epicId: null,
      sprintId: null,
      createdById: ScrumTestModule.TEST_USER_ID,
      dueDate: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  // 2 sprints: 1 active
  const activeSprintId = randomUUID();
  await module.em
    .getRepository(SprintEntity)
    .insert({
      id: activeSprintId,
      name: "Sprint 1",
      goal: null,
      projectId: id,
      startDate: now,
      endDate: now,
      status: "active",
      velocityPoints: 0,
      completedPoints: 0,
      createdAt: now,
      updatedAt: now,
    });
  await module.em
    .getRepository(SprintEntity)
    .insert({
      id: randomUUID(),
      name: "Sprint 2",
      goal: null,
      projectId: id,
      startDate: now,
      endDate: now,
      status: "completed",
      velocityPoints: 0,
      completedPoints: 0,
      createdAt: now,
      updatedAt: now,
    });

  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: `/projects/${id}/stats`,
    headers: { authorization: module.generateBearerToken() },
  });

  expect(response.statusCode).toBe(200);
  const { data } = response.json() as { data: Record<string, unknown> };
  expect(data.projectId).toBe(id);
  expect(data.epics).toEqual({ total: 2, done: 1 });
  expect(data.userStories).toEqual({ total: 5, done: 2 });
  expect(data.tasks).toEqual({ total: 8, done: 3 });
  expect(data.sprints).toEqual({ total: 2, active: 1 });
  expect((data.currentSprint as Record<string, unknown>).id).toBe(activeSprintId);
});

test("GET /projects/:id/members includes user name fields in attributes", async () => {
  const id = await seedProject();
  await module.createUser({
    id: "user-named",
    email: "named@test.com",
    firstName: "Alice",
    lastName: "Borg",
    color: "#abc",
  });
  await module.fastifyInstance.inject({
    method: "POST",
    url: `/projects/${id}/members`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { userId: "user-named", role: "member" } } },
  });

  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: `/projects/${id}/members`,
    headers: { authorization: module.generateBearerToken() },
  });

  expect(response.statusCode).toBe(200);
  const member = response.json().data[0].attributes;
  expect(member.firstName).toBe("Alice");
  expect(member.lastName).toBe("Borg");
  expect(member.userId).toBe("user-named");
});
