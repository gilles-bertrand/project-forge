import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render } from '@ember/test-helpers';
import TaskCard from '#src/components/task-card.gts';
import type { Task } from '#src/schemas/tasks.ts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

function fakeTask(extra: Record<string, unknown> = {}): Task {
  return {
    id: 'task-test',
    number: 42,
    title: 'Test Task Title',
    description: 'A test task description',
    status: 'todo',
    type: 'Frontend',
    nature: 'Bug',
    priority: 'Haute',
    points: 3,
    estimatedHours: null,
    projectId: 'proj-1',
    userStoryId: null,
    epicId: null,
    sprintId: null,
    createdById: 'user-1',
    dueDate: null,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...extra,
  } as unknown as Task;
}

describe('Integration | TaskCard', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest('renders kanban variant', async function ({ context }) {
    initializeTestApp(context.owner);
    const task = fakeTask();
    await render(
      <template><TaskCard @task={{task}} @variant="kanban" /></template>
    );
    const text = document.body.textContent ?? '';
    expect(text).toContain('#42');
    expect(text).toContain('Test Task Title');
    expect(text).toContain('A test task description');
    expect(text).toContain('Bug');
    expect(text).toContain('Frontend');
  });

  renderingTest(
    'renders dashboard variant compact',
    async function ({ context }) {
      initializeTestApp(context.owner);
      const task = fakeTask({ status: 'in-progress' });
      await render(
        <template><TaskCard @task={{task}} @variant="dashboard" /></template>
      );
      const text = document.body.textContent ?? '';
      expect(text).toContain('#42');
      expect(text).toContain('Test Task Title');
      expect(text).toContain('En cours');
      expect(text).toContain('3 pts');
    }
  );
});
