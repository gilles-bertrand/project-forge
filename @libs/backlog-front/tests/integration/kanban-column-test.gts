import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render } from '@ember/test-helpers';
import KanbanColumn from '#src/components/kanban-column.gts';
import type { Task } from '#src/schemas/tasks.ts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

function fakeTask(extra: Record<string, unknown> = {}): Task {
  return {
    id: 'task-test',
    number: 1,
    title: 'Test Task',
    description: 'desc',
    status: 'todo',
    type: 'Frontend',
    nature: 'Feature',
    priority: 'Moyenne',
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

describe('Integration | KanbanColumn', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest(
    'renders status label and task count',
    async function ({ context }) {
      initializeTestApp(context.owner);
      const tasks = [
        fakeTask({ id: 't1', number: 1 }),
        fakeTask({ id: 't2', number: 2 }),
      ];
      const noop = () => {};
      await render(
        <template>
          <KanbanColumn @status="todo" @tasks={{tasks}} @onMoveTask={{noop}} />
        </template>
      );
      const text = document.body.textContent ?? '';
      expect(text).toContain('À faire');
      expect(text).toContain('2 cartes');
    }
  );
});
