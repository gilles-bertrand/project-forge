import type { APIRequestContext, Page } from '@playwright/test';

export const E2E_USER = {
  email: 'claire.dubois@sprintforge.com',
  password: '123456789',
  id: 'user-claire',
};

const API_BASE = 'http://localhost:8000/api/v1';

export async function loginViaApi(
  request: APIRequestContext,
): Promise<{ accessToken: string; userId: string }> {
  const response = await request.post(`${API_BASE}/auth/login`, {
    data: { email: E2E_USER.email, password: E2E_USER.password },
  });
  const json = (await response.json()) as { data: { accessToken: string } };
  return { accessToken: json.data.accessToken, userId: E2E_USER.id };
}

export async function createProjectViaApi(
  request: APIRequestContext,
  token: string,
  userId: string,
  name = 'UAT Test Project',
): Promise<string> {
  const response = await request.post(`${API_BASE}/projects`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      data: {
        attributes: {
          name,
          description: 'E2E UAT test project',
          status: 'active',
          responsibleId: userId,
          createdById: userId,
        },
      },
    },
  });
  const json = (await response.json()) as { data: { id: string } };
  return json.data.id;
}

export async function createEpicViaApi(
  request: APIRequestContext,
  token: string,
  projectId: string,
  title = 'UAT Epic',
): Promise<string> {
  const response = await request.post(`${API_BASE}/epics`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      data: {
        attributes: { title, description: '', projectId, status: 'todo' },
      },
    },
  });
  const json = (await response.json()) as { data: { id: string } };
  return json.data.id;
}

export async function createUserStoryViaApi(
  request: APIRequestContext,
  token: string,
  projectId: string,
  epicId: string,
  title = 'UAT User Story',
): Promise<string> {
  const response = await request.post(`${API_BASE}/user-stories`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      data: {
        attributes: {
          title,
          description: '',
          projectId,
          epicId,
          status: 'todo',
          points: 3,
          priority: 1,
        },
      },
    },
  });
  const json = (await response.json()) as { data: { id: string } };
  return json.data.id;
}

export async function createTaskViaApi(
  request: APIRequestContext,
  token: string,
  projectId: string,
  title = 'UAT Task',
): Promise<string> {
  const response = await request.post(`${API_BASE}/tasks`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      data: {
        attributes: {
          title,
          description: '',
          status: 'todo',
          type: 'Backend',
          nature: 'Feature',
          priority: 'Moyenne',
          points: 3,
          projectId,
          createdById: E2E_USER.id,
        },
      },
    },
  });
  const json = (await response.json()) as { data: { id: string } };
  return json.data.id;
}

export async function loginViaUI(page: Page): Promise<void> {
  await page.goto('/login');
  await page
    .locator('[data-test-tpk-prefab-email-container="email"] input')
    .fill(E2E_USER.email);
  await page
    .locator('[data-test-tpk-prefab-password-container="password"] input')
    .fill(E2E_USER.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('/');
}

export async function setCurrentProject(page: Page, projectId: string): Promise<void> {
  await page.evaluate(
    (id) => localStorage.setItem('sprintforge:current-project', id),
    projectId,
  );
}
