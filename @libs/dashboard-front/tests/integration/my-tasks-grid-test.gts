import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render, find } from '@ember/test-helpers';
import MyTasksGrid from '#src/components/my-tasks-grid.gts';
import type { Task } from '@libs/backlog-front/schemas/tasks';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

function makeTask(extra: Record<string, unknown> = {}): Task {
  const base = {
    id: 'task-1', type: 'tasks', number: 1, title: 'Test task',
    description: 'desc', status: 'todo', nature: 'feature', type_: 'feature',
    priority: 'medium', points: 2, sprintId: 'sprint-1',
    projectId: 'proj-1', epicId: null, userStoryId: null,
    createdById: 'user-1', createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...extra,
  };
  return base as unknown as Task;
}

describe('Integration | MyTasksGrid', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest(
    'renders empty state when no tasks',
    async function ({ context }) {
      initializeTestApp(context.owner);
      const tasks: Task[] = [];
      await render(
        <template>
          <MyTasksGrid @tasks={{tasks}} />
        </template>
      );
      expect(find('[data-test-empty]')).toBeTruthy();
    }
  );

  renderingTest(
    'renders task cards for each task',
    async function ({ context }) {
      initializeTestApp(context.owner);
      const tasks: Task[] = [
        makeTask({ id: 'task-1', title: 'Test task' }),
        makeTask({ id: 'task-2', title: 'Test task' }),
      ];
      await render(
        <template>
          <MyTasksGrid @tasks={{tasks}} />
        </template>
      );
      const text = document.body.textContent ?? '';
      expect(text).toContain('Test task');
      expect(find('[data-test-empty]')).toBeFalsy();
    }
  );
});
