import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render } from '@ember/test-helpers';
import UserCard from '#src/components/user-card.gts';
import type { UserData } from '#src/schemas/users.ts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

function makeUser(extra: Record<string, unknown> = {}): UserData {
  return {
    id: 'u-1',
    firstName: 'Alice',
    lastName: 'Martin',
    email: 'alice@sprintforge.com',
    role: 'Product Owner',
    projectIds: [],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    password: '',
    ...extra,
  } as unknown as UserData;
}

describe('Integration | UserCard', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest('renders user name and role', async function ({ context }) {
    await initializeTestApp(context.owner);
    const user = makeUser();
    await render(<template><UserCard @user={{user}} /></template>);
    const text = document.body.textContent ?? '';
    expect(text).toContain('Alice Martin');
    expect(text).toContain('Product Owner');
  });

  renderingTest('renders email', async function ({ context }) {
    await initializeTestApp(context.owner);
    const user = makeUser();
    await render(<template><UserCard @user={{user}} /></template>);
    const text = document.body.textContent ?? '';
    expect(text).toContain('alice@sprintforge.com');
  });

  renderingTest(
    'renders project badges when projectIds present',
    async function ({ context }) {
      await initializeTestApp(context.owner);
      const user = makeUser({ projectIds: ['proj-1'] });
      await render(<template><UserCard @user={{user}} /></template>);
      const text = document.body.textContent ?? '';
      expect(text).toContain('E-Commerce Platform');
    }
  );

  renderingTest(
    'shows no project section when no projects',
    async function ({ context }) {
      await initializeTestApp(context.owner);
      const user = makeUser({ projectIds: [] });
      await render(<template><UserCard @user={{user}} /></template>);
      const text = document.body.textContent ?? '';
      expect(text).not.toContain('Projets assignés');
    }
  );
});
