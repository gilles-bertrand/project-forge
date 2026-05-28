import { afterAll, aroundEach, beforeAll, expect, test } from "vitest";
import { randomUUID } from "crypto";
import { ScrumTestModule } from "#tests/utils/setup-module.js";
import { SprintEntity } from "#src/sprint/sprint.entity.js";
import { TaskEntity } from "#src/task/task.entity.js";
import { UserStoryEntity } from "#src/user-story/user-story.entity.js";
import { EpicEntity } from "#src/epic/epic.entity.js";
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

async function seedSprint(
  overrides: Partial<{ id: string; projectId: string; status: string; name: string }> = {},
) {
  const now = new Date();
  const id = overrides.id ?? randomUUID();
  await module.em.getRepository(SprintEntity).insert({
    id,
    name: overrides.name ?? "Sprint X",
    goal: null,
    projectId: overrides.projectId ?? "p-test",
    startDate: now,
    endDate: now,
    status: overrides.status ?? "planned",
    number: 1,
    velocityPoints: 10,
    completedPoints: 0,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

test("GET /sprints returns 401 without token", async () => {
  const response = await module.fastifyInstance.inject({ method: "GET", url: "/sprints" });
  expect(response.statusCode).toBe(401);
});

test("GET /sprints returns list", async () => {
  await seedSprint({ name: "S1" });
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: "/sprints",
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().meta.total).toBeGreaterThanOrEqual(1);
});

test("GET /sprints/:id 404 unknown", async () => {
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: "/sprints/unknown",
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(404);
  expect(response.json().errors[0].code).toBe("SPRINT_NOT_FOUND");
});

test("POST /sprints creates with seeded project", async () => {
  const now = new Date();
  await module.em.getRepository(ProjectEntity).insert({
    id: "p1",
    name: "Test Project",
    description: "",
    status: "active",
    avatar: null,
    githubUrl: null,
    responsibleId: ScrumTestModule.TEST_USER_ID,
    createdById: ScrumTestModule.TEST_USER_ID,
    sprintDurationDays: 14,
    defaultVelocityPoints: 20,
    createdAt: now,
    updatedAt: now,
  });

  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: "/sprints",
    headers: { authorization: module.generateBearerToken(), "content-type": "application/json" },
    payload: {
      data: {
        attributes: {
          name: "Sprint 99",
          goal: "Goal X",
          projectId: "p1",
          startDate: "2025-02-01T00:00:00Z",
          endDate: "2025-02-14T00:00:00Z",
        },
      },
    },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.name).toBe("Sprint 99");
  expect(response.json().data.attributes.number).toBe(1);
});

test("PATCH /sprints/:id updates goal", async () => {
  const id = await seedSprint();
  const response = await module.fastifyInstance.inject({
    method: "PATCH",
    url: `/sprints/${id}`,
    headers: { authorization: module.generateBearerToken() },
    payload: { data: { attributes: { goal: "New goal" } } },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.goal).toBe("New goal");
});

test("DELETE /sprints/:id returns 204", async () => {
  const id = await seedSprint();
  const response = await module.fastifyInstance.inject({
    method: "DELETE",
    url: `/sprints/${id}`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(204);
});

test("POST /sprints/:id/start: planned → active", async () => {
  const id = await seedSprint({ projectId: "p-start-1", status: "planned" });
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: `/sprints/${id}/start`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.status).toBe("active");
});

test("POST /sprints/:id/start: 409 if not planned", async () => {
  const id = await seedSprint({ projectId: "p-start-2", status: "completed" });
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: `/sprints/${id}/start`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(409);
  expect(response.json().errors[0].code).toBe("SPRINT_NOT_PLANNED");
});

test("POST /sprints/:id/start: 409 if another sprint already active for project", async () => {
  await seedSprint({ projectId: "p-start-3", status: "active" });
  const id = await seedSprint({ projectId: "p-start-3", status: "planned" });
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: `/sprints/${id}/start`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(409);
  expect(response.json().errors[0].code).toBe("ACTIVE_SPRINT_EXISTS");
});

test("POST /sprints/:id/stop: active → completed", async () => {
  const id = await seedSprint({ projectId: "p-stop-1", status: "active" });
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: `/sprints/${id}/stop`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.status).toBe("completed");
});

test("POST /sprints/:id/stop: 409 if not active", async () => {
  const id = await seedSprint({ projectId: "p-stop-2", status: "planned" });
  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: `/sprints/${id}/stop`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(409);
  expect(response.json().errors[0].code).toBe("SPRINT_NOT_ACTIVE");
});

// ─── seed helpers for close-preview / extended stop tests ───────────────────

async function seedTask(
  overrides: Partial<{
    id: string;
    projectId: string;
    sprintId: string | null;
    status: string;
    title: string;
    userStoryId: string | null;
  }> = {},
) {
  const now = new Date();
  const id = overrides.id ?? randomUUID();
  await module.em.getRepository(TaskEntity).insert({
    id,
    number: Math.floor(Math.random() * 100_000),
    title: overrides.title ?? "Task X",
    description: "",
    status: overrides.status ?? "todo",
    type: "Backend",
    nature: "Feature",
    priority: "Moyenne",
    points: 3,
    estimatedHours: null,
    projectId: overrides.projectId ?? "p-test",
    userStoryId: overrides.userStoryId ?? null,
    epicId: null,
    sprintId: overrides.sprintId ?? null,
    createdById: "test-user-id",
    dueDate: null,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

async function seedUserStory(
  overrides: Partial<{
    id: string;
    projectId: string;
    sprintId: string | null;
    status: string;
    title: string;
  }> = {},
) {
  const now = new Date();
  const id = overrides.id ?? randomUUID();
  await module.em.getRepository(UserStoryEntity).insert({
    id,
    title: overrides.title ?? "Story X",
    description: "",
    notes: null,
    color: null,
    projectId: overrides.projectId ?? "p-test",
    epicId: null,
    sprintId: overrides.sprintId ?? null,
    status: overrides.status ?? "accepted",
    points: 5,
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

// ─── GET /sprints/:id/close-preview ──────────────────────────────────────────

test("GET /sprints/:id/close-preview → lists unfinished tasks and stories", async () => {
  const sprintId = await seedSprint({ projectId: "p-preview-1", status: "active" });
  await seedTask({ projectId: "p-preview-1", sprintId, status: "in-progress", title: "T1" });
  await seedTask({ projectId: "p-preview-1", sprintId, status: "done", title: "T2-done" });
  await seedUserStory({ projectId: "p-preview-1", sprintId, status: "accepted", title: "US1" });

  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: `/sprints/${sprintId}/close-preview`,
    headers: { authorization: module.generateBearerToken() },
  });

  expect(response.statusCode).toBe(200);
  const data = response.json().data;
  expect(data.sprintId).toBe(sprintId);
  expect(data.unfinishedTasks).toHaveLength(1);
  expect(data.unfinishedTasks[0].title).toBe("T1");
  expect(data.unfinishedStories).toHaveLength(1);
  expect(data.unfinishedStories[0].title).toBe("US1");
});

// ─── POST /sprints/:id/stop — extended behavior ──────────────────────────────

test("POST /sprints/:id/stop without unfinished items → closes without action", async () => {
  const sprintId = await seedSprint({ projectId: "p-stop-clean-1", status: "active" });
  await seedTask({ projectId: "p-stop-clean-1", sprintId, status: "done" });

  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: `/sprints/${sprintId}/stop`,
    headers: { authorization: module.generateBearerToken() },
  });

  expect(response.statusCode).toBe(200);
  expect(response.json().data.attributes.status).toBe("completed");
  expect(response.json().meta.movedTasks).toBe(0);
});

test("POST /sprints/:id/stop with unfinished and no action → 422 CLOSE_ACTION_REQUIRED", async () => {
  const sprintId = await seedSprint({ projectId: "p-stop-422-1", status: "active" });
  await seedTask({ projectId: "p-stop-422-1", sprintId, status: "in-progress" });

  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: `/sprints/${sprintId}/stop`,
    headers: { authorization: module.generateBearerToken() },
  });

  expect(response.statusCode).toBe(422);
  expect(response.json().errors[0].code).toBe("CLOSE_ACTION_REQUIRED");
});

test("POST /sprints/:id/stop action=send-to-backlog → sprintId set to null", async () => {
  const sprintId = await seedSprint({ projectId: "p-stop-btl-1", status: "active" });
  const taskId = await seedTask({ projectId: "p-stop-btl-1", sprintId, status: "in-progress" });

  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: `/sprints/${sprintId}/stop`,
    headers: { authorization: module.generateBearerToken(), "content-type": "application/json" },
    payload: { data: { attributes: { action: "send-to-backlog" } } },
  });

  expect(response.statusCode).toBe(200);
  expect(response.json().meta.action).toBe("send-to-backlog");
  expect(response.json().meta.targetSprintId).toBeNull();

  module.em.clear();
  const task = await module.em.findOne(TaskEntity, { id: taskId });
  expect(task?.sprintId).toBeNull();
});

test("POST /sprints/:id/stop action=move-to-existing valid → reassigns items", async () => {
  const projectId = "p-stop-move-1";
  const sprintId = await seedSprint({ projectId, status: "active" });
  const targetId = await seedSprint({ projectId, status: "planned", name: "Sprint Next" });
  const taskId = await seedTask({ projectId, sprintId, status: "todo" });

  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: `/sprints/${sprintId}/stop`,
    headers: { authorization: module.generateBearerToken(), "content-type": "application/json" },
    payload: { data: { attributes: { action: "move-to-existing", targetSprintId: targetId } } },
  });

  expect(response.statusCode).toBe(200);
  expect(response.json().meta.targetSprintId).toBe(targetId);

  module.em.clear();
  const task = await module.em.findOne(TaskEntity, { id: taskId });
  expect(task?.sprintId).toBe(targetId);
});

test("POST /sprints/:id/stop action=move-to-existing with completed target → 409", async () => {
  const projectId = "p-stop-409-1";
  const sprintId = await seedSprint({ projectId, status: "active" });
  const completedId = await seedSprint({ projectId, status: "completed", name: "Done Sprint" });
  await seedTask({ projectId, sprintId, status: "todo" });

  const response = await module.fastifyInstance.inject({
    method: "POST",
    url: `/sprints/${sprintId}/stop`,
    headers: { authorization: module.generateBearerToken(), "content-type": "application/json" },
    payload: {
      data: { attributes: { action: "move-to-existing", targetSprintId: completedId } },
    },
  });

  expect(response.statusCode).toBe(409);
  expect(response.json().errors[0].code).toBe("TARGET_SPRINT_COMPLETED");
});

// ─── seed helpers for items tests ────────────────────────────────────────────

async function seedEpic(overrides: Partial<{ id: string; projectId: string }> = {}) {
  const now = new Date();
  const id = overrides.id ?? randomUUID();
  await module.em.getRepository(EpicEntity).insert({
    id,
    title: "Epic X",
    description: "",
    notes: null,
    color: "#6B7280",
    type: "functional",
    value: null,
    rank: 0,
    projectId: overrides.projectId ?? "p-items",
    createdById: null,
    status: "todo",
    tags: [],
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

async function seedStory(
  overrides: Partial<{
    id: string;
    projectId: string;
    epicId: string | null;
    sprintId: string | null;
  }> = {},
) {
  const now = new Date();
  const id = overrides.id ?? randomUUID();
  await module.em.getRepository(UserStoryEntity).insert({
    id,
    title: "Story X",
    description: "",
    notes: null,
    color: null,
    projectId: overrides.projectId ?? "p-items",
    epicId: overrides.epicId ?? null,
    sprintId: overrides.sprintId ?? null,
    status: "accepted",
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

async function seedItemTask(
  overrides: Partial<{
    id: string;
    projectId: string;
    epicId: string | null;
    userStoryId: string | null;
    sprintId: string | null;
  }> = {},
) {
  const now = new Date();
  const id = overrides.id ?? randomUUID();
  await module.em.getRepository(TaskEntity).insert({
    id,
    number: Math.floor(Math.random() * 100_000),
    title: "Item Task X",
    description: "",
    status: "todo",
    type: "Backend",
    nature: "Feature",
    priority: "Moyenne",
    points: 2,
    estimatedHours: null,
    projectId: overrides.projectId ?? "p-items",
    epicId: overrides.epicId ?? null,
    userStoryId: overrides.userStoryId ?? null,
    sprintId: overrides.sprintId ?? null,
    createdById: "test-user-id",
    dueDate: null,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

// ─── items tests ──────────────────────────────────────────────────────────────

test("POST /sprints/:id/items kind=task → assigne la tâche", async () => {
  const sprintId = await seedSprint({ projectId: "p-items", status: "planned" });
  const taskId = await seedItemTask({ projectId: "p-items" });

  const res = await module.fastifyInstance.inject({
    method: "POST",
    url: `/sprints/${sprintId}/items`,
    headers: { authorization: module.generateBearerToken(), "content-type": "application/json" },
    payload: { data: { attributes: { kind: "task", id: taskId } } },
  });
  expect(res.statusCode).toBe(200);
  expect(res.json().meta.addedCount).toBe(1);
  module.em.clear();
  const task = await module.em.findOne(TaskEntity, { id: taskId });
  expect(task?.sprintId).toBe(sprintId);
});

test("POST /sprints/:id/items kind=story → assigne l'US et ses tâches", async () => {
  const sprintId = await seedSprint({ projectId: "p-items", status: "planned" });
  const storyId = await seedStory({ projectId: "p-items" });
  const taskId = await seedItemTask({ projectId: "p-items", userStoryId: storyId });

  const res = await module.fastifyInstance.inject({
    method: "POST",
    url: `/sprints/${sprintId}/items`,
    headers: { authorization: module.generateBearerToken(), "content-type": "application/json" },
    payload: { data: { attributes: { kind: "story", id: storyId } } },
  });
  expect(res.statusCode).toBe(200);
  expect(res.json().meta.addedCount).toBe(2); // story + task
  module.em.clear();
  const task = await module.em.findOne(TaskEntity, { id: taskId });
  expect(task?.sprintId).toBe(sprintId);
});

test("POST /sprints/:id/items kind=epic → cascade tâches + US sans tâches (C6.B)", async () => {
  const sprintId = await seedSprint({ projectId: "p-items", status: "planned" });
  const epicId = await seedEpic({ projectId: "p-items" });
  const storyWithTask = await seedStory({ projectId: "p-items", epicId });
  const storyWithoutTask = await seedStory({ projectId: "p-items", epicId });
  const taskId = await seedItemTask({ projectId: "p-items", epicId, userStoryId: storyWithTask });

  const res = await module.fastifyInstance.inject({
    method: "POST",
    url: `/sprints/${sprintId}/items`,
    headers: { authorization: module.generateBearerToken(), "content-type": "application/json" },
    payload: { data: { attributes: { kind: "epic", id: epicId } } },
  });
  expect(res.statusCode).toBe(200);
  expect(res.json().meta.addedCount).toBe(2); // task + storyWithoutTask
  module.em.clear();
  const task = await module.em.findOne(TaskEntity, { id: taskId });
  expect(task?.sprintId).toBe(sprintId);
  const noTaskStory = await module.em.findOne(UserStoryEntity, { id: storyWithoutTask });
  expect(noTaskStory?.sprintId).toBe(sprintId);
});

test("POST /sprints/:id/items kind=epic avec conflit → conflit retourné, déplacement effectué", async () => {
  const sprintId = await seedSprint({ projectId: "p-items", status: "planned" });
  const otherSprintId = await seedSprint({ projectId: "p-items", status: "planned" });
  const epicId = await seedEpic({ projectId: "p-items" });
  const storyId = await seedStory({ projectId: "p-items", epicId });
  const taskId = await seedItemTask({
    projectId: "p-items",
    epicId,
    userStoryId: storyId,
    sprintId: otherSprintId,
  });

  const res = await module.fastifyInstance.inject({
    method: "POST",
    url: `/sprints/${sprintId}/items`,
    headers: { authorization: module.generateBearerToken(), "content-type": "application/json" },
    payload: { data: { attributes: { kind: "epic", id: epicId } } },
  });
  expect(res.statusCode).toBe(200);
  expect(res.json().meta.conflictCount).toBeGreaterThan(0);
  module.em.clear();
  const task = await module.em.findOne(TaskEntity, { id: taskId });
  expect(task?.sprintId).toBe(sprintId); // reassigned despite conflict
});

test("POST /sprints/:id/items sprint completed → 409", async () => {
  const sprintId = await seedSprint({ projectId: "p-items", status: "completed" });
  const taskId = await seedItemTask({ projectId: "p-items" });

  const res = await module.fastifyInstance.inject({
    method: "POST",
    url: `/sprints/${sprintId}/items`,
    headers: { authorization: module.generateBearerToken(), "content-type": "application/json" },
    payload: { data: { attributes: { kind: "task", id: taskId } } },
  });
  expect(res.statusCode).toBe(409);
  expect(res.json().errors[0].code).toBe("SPRINT_COMPLETED");
});
