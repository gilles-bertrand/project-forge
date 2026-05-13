import { afterAll, aroundEach, beforeAll, expect, test } from "vitest";
import { randomUUID } from "crypto";
import { ScrumTestModule } from "#tests/utils/setup-module.js";
import { ProjectEntity } from "#src/project/project.entity.js";
import { EpicEntity } from "#src/epic/epic.entity.js";

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

test("DELETE /projects/:id returns 409 when dependencies exist", async () => {
  const id = await seedProject();
  const now = new Date();
  await module.em.getRepository(EpicEntity).insert({
    id: randomUUID(),
    title: "blocker",
    description: "blocker",
    projectId: id,
    status: "todo",
    createdAt: now,
    updatedAt: now,
  });

  const response = await module.fastifyInstance.inject({
    method: "DELETE",
    url: `/projects/${id}`,
    headers: { authorization: module.generateBearerToken() },
  });
  expect(response.statusCode).toBe(409);
  expect(response.json().errors[0].code).toBe("PROJECT_HAS_DEPENDENCIES");
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
