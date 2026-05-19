import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render, find } from '@ember/test-helpers';
import UsersGrid from '#src/components/users-grid.gts';
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

describe('Integration | UsersGrid', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest(
    'renders empty state when no users',
    async function ({ context }) {
      await initializeTestApp(context.owner);
      const users: UserData[] = [];
      await render(<template><UsersGrid @users={{users}} /></template>);
      expect(find('[data-test-empty]')).toBeTruthy();
    }
  );

  renderingTest('renders a card per user', async function ({ context }) {
    await initializeTestApp(context.owner);
    const users: UserData[] = [
      makeUser({ id: 'u-1', firstName: 'Alice', lastName: 'Martin' }),
      makeUser({ id: 'u-2', firstName: 'Bob', lastName: 'Durant' }),
    ];
    await render(<template><UsersGrid @users={{users}} /></template>);
    const text = (document.body.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain('Alice Martin');
    expect(text).toContain('Bob Durant');
  });
});
