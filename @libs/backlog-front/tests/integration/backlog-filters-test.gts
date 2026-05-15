import { describe, expect as hardExpect, vi } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render, click } from '@ember/test-helpers';
import BacklogFilters from '#src/components/backlog-filters.gts';
import type { Task } from '#src/schemas/tasks.ts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

function fakeTasks(): Task[] {
  return [
    {
      id: 't1',
      number: 1,
      title: 'Bug Task',
      type: 'Frontend',
      nature: 'Bug',
      status: 'todo',
      priority: 'Haute',
      points: 1,
      estimatedHours: null,
      projectId: 'p1',
      userStoryId: null,
      epicId: null,
      sprintId: null,
      createdById: 'u1',
      dueDate: null,
      createdAt: '',
      updatedAt: '',
      description: '',
    } as Task,
    {
      id: 't2',
      number: 2,
      title: 'Feature Task',
      type: 'Backend',
      nature: 'Feature',
      status: 'todo',
      priority: 'Moyenne',
      points: 2,
      estimatedHours: null,
      projectId: 'p1',
      userStoryId: null,
      epicId: null,
      sprintId: null,
      createdById: 'u1',
      dueDate: null,
      createdAt: '',
      updatedAt: '',
      description: '',
    } as Task,
  ];
}

describe('Integration | BacklogFilters', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest(
    'Renders all filter buttons and calls onFilter',
    async function ({ context }) {
      initializeTestApp(context.owner);
      const tasks = fakeTasks();
      const onFilter = vi.fn();

      await render(
        <template>
          <BacklogFilters @tasks={{tasks}} @onFilter={{onFilter}} />
        </template>
      );

      const text = document.body.textContent ?? '';
      expect(text).toContain('Tous');
      expect(text).toContain('Bug');
      expect(text).toContain('Feature');
      expect(text).toContain('Frontend');
      expect(text).toContain('Backend');

      const bugBtn = document.querySelector(
        '[data-test-backlog-filters] button:nth-child(2)'
      );
      if (bugBtn) await click(bugBtn);
      expect(onFilter).toHaveBeenCalled();
    }
  );
});
