import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render } from '@ember/test-helpers';
import TaskRow from '#src/components/task-row.gts';
import type { Task } from '#src/schemas/tasks.ts';
import type { UserStory } from '#src/schemas/user-stories.ts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

function fakeTask(extra: Record<string, unknown> = {}): Task {
  return {
    id: 'task-test',
    number: 42,
    title: 'Test Task Title',
    description: 'desc',
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

describe('Integration | TaskRow', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest('Renders task number and title', async function ({ context }) {
    initializeTestApp(context.owner);
    const task = fakeTask();
    await render(<template><TaskRow @task={{task}} /></template>);
    const text = document.body.textContent ?? '';
    expect(text).toContain('#42');
    expect(text).toContain('Test Task Title');
    expect(text).toContain('3 pts');
    expect(text).toContain('Bug');
    expect(text).toContain('Frontend');
  });

  renderingTest(
    'Shows US link when userStory provided',
    async function ({ context }) {
      initializeTestApp(context.owner);
      const task = fakeTask({ userStoryId: 'us-1' });
      const us = {
        id: 'us-1',
        title: 'My User Story',
      } as unknown as UserStory;
      await render(
        <template><TaskRow @task={{task}} @userStory={{us}} /></template>
      );
      expect(document.body.textContent).toContain('→ My User Story');
    }
  );
});
