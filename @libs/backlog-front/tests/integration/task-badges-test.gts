import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render } from '@ember/test-helpers';
import TaskStatusBadge from '#src/components/task-status-badge.gts';
import TaskPriorityBadge from '#src/components/task-priority-badge.gts';
import TaskNatureBadge from '#src/components/task-nature-badge.gts';
import TaskTypeBadge from '#src/components/task-type-badge.gts';
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

describe('Integration | TaskNatureBadge', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest('renders nature label', async function ({ context }) {
    initializeTestApp(context.owner);
    await render(<template><TaskNatureBadge @nature="Techdebt" /></template>);
    const badge = document.querySelector('.badge');
    expect(badge).not.toBeNull();
  });
});

describe('Integration | TaskTypeBadge', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest('renders type label', async function ({ context }) {
    initializeTestApp(context.owner);
    await render(<template><TaskTypeBadge @type="Frontend" /></template>);
    const badge = document.querySelector('.badge');
    expect(badge).not.toBeNull();
  });
});
