import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render, click } from '@ember/test-helpers';
import UserStoryRow from '#src/components/user-story-row.gts';
import type { UserStory } from '#src/schemas/user-stories.ts';
import type { Task } from '#src/schemas/tasks.ts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

function fakeUS(): UserStory {
  return {
    id: 'us-1',
    title: 'My User Story',
    description: '',
    projectId: 'proj-1',
    epicId: 'epic-1',
    status: 'todo',
    points: 5,
    priority: 1,
    createdAt: '',
    updatedAt: '',
  } as UserStory;
}

function fakeTask(usId: string): Task {
  return {
    id: 'task-1',
    number: 7,
    title: 'Task Under US',
    description: '',
    status: 'todo',
    type: 'Frontend',
    nature: 'Feature',
    priority: 'Moyenne',
    points: 2,
    estimatedHours: null,
    projectId: 'proj-1',
    userStoryId: usId,
    epicId: null,
    sprintId: null,
    createdById: 'u1',
    dueDate: null,
    createdAt: '',
    updatedAt: '',
  } as unknown as Task;
}

describe('Integration | UserStoryRow', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest(
    'Renders title, points and i18n US label, collapsed by default',
    async function ({ context }) {
      initializeTestApp(context.owner);
      const us = fakeUS();

      await render(<template><UserStoryRow @userStory={{us}} /></template>);

      const text = document.body.textContent ?? '';
      expect(text).toContain('My User Story');
      expect(text).toContain('US');
      expect(text).toContain('5 pts');
      // Collapsed — task not visible
      expect(text).not.toContain('Task Under US');
    }
  );

  renderingTest(
    'Expands to reveal tasks on click',
    async function ({ context }) {
      initializeTestApp(context.owner);
      const us = fakeUS();
      const tasks = [fakeTask('us-1')];

      await render(
        <template><UserStoryRow @userStory={{us}} @tasks={{tasks}} /></template>
      );

      const btn = document.querySelector('[data-test-user-story-row] button');
      if (btn) await click(btn);

      expect(document.body.textContent).toContain('Task Under US');
    }
  );
});
