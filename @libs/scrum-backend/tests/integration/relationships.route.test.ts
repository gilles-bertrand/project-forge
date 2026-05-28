import { afterAll, aroundEach, beforeAll, expect, test } from "vitest";
import { randomUUID } from "crypto";
import { ScrumTestModule } from "#tests/utils/setup-module.js";
import { EpicEntity } from "#src/epic/epic.entity.js";
import { ProjectEntity } from "#src/project/project.entity.js";
import { SprintEntity } from "#src/sprint/sprint.entity.js";
import { TaskEntity } from "#src/task/task.entity.js";
import { UserStoryEntity } from "#src/user-story/user-story.entity.js";

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

const NOW = new Date();

async function setupTree() {
  const projectId = randomUUID();
  const epicId = randomUUID();
  const storyId = randomUUID();
  const sprintId = randomUUID();
  const taskId = randomUUID();

  await module.em.getRepository(ProjectEntity).insert({
    id: projectId,
    name: "P",
    description: "d",
    status: "active",
    avatar: null,
    githubUrl: null,
    responsibleId: "u1",
    createdById: "u1",
    sprintDurationDays: 14,
    defaultVelocityPoints: 20,
    createdAt: NOW,
    updatedAt: NOW,
  });

  await module.em.getRepository(EpicEntity).insert({
    id: epicId,
    title: "E",
    description: "d",
    notes: null,
    color: "#6B7280",
    type: "functional",
    value: null,
    rank: 0,
    projectId,
    createdById: null,
    status: "in-progress",
    tags: [],
    createdAt: NOW,
    updatedAt: NOW,
  });

  await module.em.getRepository(UserStoryEntity).insert({
    id: storyId,
    title: "US",
    description: "d",
    notes: null,
    color: null,
    projectId,
    epicId,
    sprintId: null,
    status: "accepted",
    points: 5,
    priority: "Moyenne",
    rank: 0,
    value: null,
    createdById: null,
    tags: [],
    createdAt: NOW,
    updatedAt: NOW,
  });

  await module.em.getRepository(SprintEntity).insert({
    id: sprintId,
    number: 1,
    name: "Sprint",
    goal: null,
    projectId,
    startDate: NOW,
    endDate: NOW,
    status: "active",
    velocityPoints: 10,
    completedPoints: 0,
    createdAt: NOW,
    updatedAt: NOW,
  });

  await module.em.getRepository(TaskEntity).insert({
    id: taskId,
    number: 1001,
    title: "T",
    description: "d",
    status: "in-progress",
    type: "Backend",
    nature: "Feature",
    priority: "Haute",
    points: 3,
    estimatedHours: null,
    projectId,
    userStoryId: storyId,
    epicId,
    sprintId,
    createdById: "u1",
    dueDate: null,
    createdAt: NOW,
    updatedAt: NOW,
  });

  return { projectId, epicId, storyId, sprintId, taskId };
}

test("GET /projects/:id/tasks returns tasks of project", async () => {
  const ids = await setupTree();
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: `/projects/${ids.projectId}/tasks`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().meta.total).toBe(1);
});

test("GET /projects/:id/sprints returns sprints", async () => {
  const ids = await setupTree();
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: `/projects/${ids.projectId}/sprints`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().meta.total).toBe(1);
});

test("GET /projects/:id/epics returns epics", async () => {
  const ids = await setupTree();
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: `/projects/${ids.projectId}/epics`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().meta.total).toBe(1);
});

test("GET /projects/:id/user-stories returns stories", async () => {
  const ids = await setupTree();
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: `/projects/${ids.projectId}/user-stories`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().meta.total).toBe(1);
});

test("GET /epics/:id/user-stories returns child stories", async () => {
  const ids = await setupTree();
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: `/epics/${ids.epicId}/user-stories`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().meta.total).toBe(1);
});

test("GET /epics/:id/tasks returns child tasks", async () => {
  const ids = await setupTree();
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: `/epics/${ids.epicId}/tasks`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().meta.total).toBe(1);
});

test("GET /user-stories/:id/tasks returns child tasks", async () => {
  const ids = await setupTree();
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: `/user-stories/${ids.storyId}/tasks`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().meta.total).toBe(1);
});

test("GET /sprints/:id/tasks returns tasks of sprint", async () => {
  const ids = await setupTree();
  const response = await module.fastifyInstance.inject({
    method: "GET",
    url: `/sprints/${ids.sprintId}/tasks`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().meta.total).toBe(1);
});
