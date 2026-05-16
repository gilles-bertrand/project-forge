import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render } from '@ember/test-helpers';
import KanbanBoard from '#src/components/kanban-board.gts';
import type { Task } from '#src/schemas/tasks.ts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

function fakeTask(status: Task['status'], id: string, number: number): Task {
  return {
    id,
    number,
    title: `Task ${number}`,
    description: '',
    status,
    type: 'Frontend',
    nature: 'Feature',
    priority: 'Moyenne',
    points: 1,
    estimatedHours: null,
    projectId: 'proj-1',
    userStoryId: null,
    epicId: null,
    sprintId: null,
    createdById: 'user-1',
    dueDate: null,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  } as unknown as Task;
}

describe('Integration | KanbanBoard', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest(
    'renders 5 columns with tasks distributed by status',
    async function ({ context }) {
      initializeTestApp(context.owner);
      const tasks = [
        fakeTask('todo', 't1', 1),
        fakeTask('in-progress', 't2', 2),
        fakeTask('done', 't3', 3),
        fakeTask('done', 't4', 4),
      ];
      const noop = () => {};
      await render(
        <template>
          <KanbanBoard @tasks={{tasks}} @onMoveTask={{noop}} />
        </template>
      );
      const columns = document.querySelectorAll('[data-test-kanban-column]');
      expect(columns.length).toBe(5);
      const text = document.body.textContent ?? '';
      expect(text).toContain('À faire');
      expect(text).toContain('En cours');
      expect(text).toContain('À tester');
      expect(text).toContain('UAT');
      expect(text).toContain('Terminé');
    }
  );
});
