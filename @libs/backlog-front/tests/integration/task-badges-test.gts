import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render } from '@ember/test-helpers';
import TaskStatusBadge from '#src/components/task-status-badge.gts';
import TaskPriorityBadge from '#src/components/task-priority-badge.gts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

describe('Integration | TaskStatusBadge', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest('renders status label', async function ({ context }) {
    initializeTestApp(context.owner);
    await render(
      <template><TaskStatusBadge @status="in-progress" /></template>
    );
    const text = document.body.textContent ?? '';
    expect(text).toContain('En cours');
  });
});

describe('Integration | TaskPriorityBadge', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest('renders priority label', async function ({ context }) {
    initializeTestApp(context.owner);
    await render(<template><TaskPriorityBadge @priority="Haute" /></template>);
    const text = document.body.textContent ?? '';
    expect(text).toContain('Haute');
  });
});
