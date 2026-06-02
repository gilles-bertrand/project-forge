import { afterAll, aroundEach, beforeAll, expect, test } from "vitest";
import { randomUUID } from "crypto";
import { ScrumTestModule } from "#tests/utils/setup-module.js";
import { HistoryEntryEntity } from "#src/task/history-entry.entity.js";
import { TaskEntity } from "#src/task/task.entity.js";
import { UserStoryEntity } from "#src/user-story/user-story.entity.js";
import { SprintEntity } from "#src/sprint/sprint.entity.js";
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

async function seedTask(overrides: Partial<{ id: string; status: string }> = {}) {
  const now = new Date();
  const id = overrides.id ?? randomUUID();
  await module.em.getRepository(TaskEntity).insert({
    id,
    number: 5001,
    title: "Audit Task",
    description: "d",
    status: overrides.status ?? "todo",
    type: "Backend",
    nature: "Feature",
    priority: "Moyenne",
    points: 3,
    estimatedHours: null,
    projectId: "p-audit",
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

async function seedStory(overrides: Partial<{ id: string; status: string }> = {}) {
  const now = new Date();
  const id = overrides.id ?? randomUUID();
  await module.em.getRepository(UserStoryEntity).insert({
    id,
    title: "Audit Story",
    description: "d",
    notes: null,
    color: null,
    projectId: "p-audit",
    epicId: null,
    sprintId: null,
    status: overrides.status ?? "suggested",
    points: 3,
    priority: "Moyenne",
    rank: 0,
    value: null,
    createdById: null,
    tags: [],
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

async function seedSprint(overrides: Partial<{ id: string; status: string }> = {}) {
  const now = new Date();
  const id = overrides.id ?? randomUUID();
  await module.em.getRepository(SprintEntity).insert({
    id,
    name: "Audit Sprint",
    goal: null,
    projectId: "p-audit-sprint",
    startDate: now,
    endDate: now,
    status: overrides.status ?? "planned",
    number: 1,
    velocityPoints: 0,
    completedPoints: 0,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

async function listHistory(ownerType: string, ownerId: string) {
  return module.em.getRepository(HistoryEntryEntity).findAll({
    where: { ownerType, ownerId },
    orderBy: { createdAt: "ASC" },
  });
}

test("PATCH /tasks/:id changing status creates an audit entry", async () => {
  const id = await seedTask({ status: "todo" });
  const response = await module.fastifyInstance.inject({
    method: "PATCH",
    url: `/tasks/${id}`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { status: "in-progress" } } },
  });
  expect(response.statusCode).toBe(200);

  const entries = await listHistory("task", id);
  expect(entries.length).toBe(1);
  const [entry] = entries;
  expect(entry?.type).toBe("status-change");
  expect(entry?.userId).toBe(ScrumTestModule.TEST_USER_ID);
  expect(entry?.metadata).toEqual({ from: "todo", to: "in-progress" });
});

test("PATCH /user-stories/:id status transition creates an audit entry", async () => {
  const id = await seedStory({ status: "suggested" });
  const response = await module.fastifyInstance.inject({
    method: "PATCH",
    url: `/user-stories/${id}`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { status: "accepted" } } },
  });
  expect(response.statusCode).toBe(200);

  const entries = await listHistory("story", id);
  expect(entries.length).toBe(1);
  const [entry] = entries;
  expect(entry?.metadata).toEqual({ from: "suggested", to: "accepted" });
  expect(entry?.userId).toBe(ScrumTestModule.TEST_USER_ID);
});

test("direct em.insert (no request context) does NOT create an audit entry", async () => {
  const id = randomUUID();
  const now = new Date();
  await module.em.getRepository(TaskEntity).insert({
    id,
    number: 5099,
    title: "Seeder Task",
    description: "d",
    status: "todo",
    type: "Backend",
    nature: "Feature",
    priority: "Moyenne",
    points: 1,
    estimatedHours: null,
    projectId: "p-audit-seed",
    userStoryId: null,
    epicId: null,
    sprintId: null,
    createdById: ScrumTestModule.TEST_USER_ID,
    dueDate: null,
    createdAt: now,
    updatedAt: now,
  });
  // Update directly (no Fastify request → no auditContext)
  await module.em
    .getRepository(TaskEntity)
    .nativeUpdate({ id }, { status: "done", updatedAt: new Date() });

  const entries = await listHistory("task", id);
  expect(entries.length).toBe(0);
});

test("PATCH of a non-audited field (description) creates no audit entry", async () => {
  const id = await seedTask({ status: "todo" });
  const response = await module.fastifyInstance.inject({
    method: "PATCH",
    url: `/tasks/${id}`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { description: "Nouvelle description" } } },
  });
  expect(response.statusCode).toBe(200);

  const entries = await listHistory("task", id);
  expect(entries.length).toBe(0);
});

test("PATCH /tasks/:id changing title creates a title-change entry", async () => {
  const id = await seedTask({ status: "todo" });
  const response = await module.fastifyInstance.inject({
    method: "PATCH",
    url: `/tasks/${id}`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { title: "Titre renommé" } } },
  });
  expect(response.statusCode).toBe(200);

  const entries = await listHistory("task", id);
  expect(entries.length).toBe(1);
  expect(entries[0]?.type).toBe("title-change");
  expect(entries[0]?.metadata).toEqual({
    field: "title",
    from: "Audit Task",
    to: "Titre renommé",
  });
});

test("PATCH /tasks/:id changing priority and points creates two entries", async () => {
  const id = await seedTask({ status: "todo" });
  const response = await module.fastifyInstance.inject({
    method: "PATCH",
    url: `/tasks/${id}`,
    headers: { authorization: module.generateBearerToken() },
    payload: {
      data: { attributes: { priority: "Haute", points: 8 } },
    },
  });
  expect(response.statusCode).toBe(200);

  const entries = await listHistory("task", id);
  const types = entries.map((e) => e.type).sort();
  expect(types).toEqual(["points-change", "priority-change"]);
});

test("POST/DELETE /tasks/:id/assignees create assignee audit entries", async () => {
  const id = await seedTask({ status: "todo" });
  const userId = randomUUID();
  // l'assigné doit être membre du projet (p-audit)
  await module.em.getRepository(ProjectMemberEntity).insert({
    id: randomUUID(),
    projectId: "p-audit",
    userId,
    role: "Developer",
    joinedAt: new Date(),
  });

  const add = await module.fastifyInstance.inject({
    method: "POST",
    url: `/tasks/${id}/assignees`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { userId } } },
  });
  expect(add.statusCode).toBe(200);

  const del = await module.fastifyInstance.inject({
    method: "DELETE",
    url: `/tasks/${id}/assignees/${userId}`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(del.statusCode).toBe(204);

  const entries = await listHistory("task", id);
  const types = entries.map((e) => e.type);
  expect(types).toContain("assignee-added");
  expect(types).toContain("assignee-removed");
  const added = entries.find((e) => e.type === "assignee-added");
  expect(added?.metadata).toEqual({ userId });
});

test("POST /sprints/:id/start creates an audit entry (planned → active)", async () => {
  const id = await seedSprint({ status: "planned" });
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: `/sprints/${id}/start`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);

  const entries = await listHistory("sprint", id);
  expect(entries.length).toBe(1);
  const [entry] = entries;
  expect(entry?.metadata).toEqual({ from: "planned", to: "active" });
  expect(entry?.userId).toBe(ScrumTestModule.TEST_USER_ID);
});
