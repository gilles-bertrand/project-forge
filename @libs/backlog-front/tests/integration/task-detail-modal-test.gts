import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { click, render } from '@ember/test-helpers';
import Service from '@ember/service';
import TaskDetailModal from '#src/components/task-detail-modal.gts';
import type { Task } from '#src/schemas/tasks.ts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

class FakeTasksService extends Service {
  loadComments() {
    return Promise.resolve([
      {
        id: 'c1',
        taskId: 'task-test',
        authorId: 'user-2',
        content: 'Test comment',
        createdAt: '2025-01-01T00:00:00Z',
      },
    ]);
  }
  loadHistory() {
    return Promise.resolve([
      {
        id: 'h1',
        taskId: 'task-test',
        field: 'status',
        oldValue: null,
        newValue: 'todo',
        changedById: 'user-2',
        createdAt: '2025-01-01T00:00:00Z',
      },
    ]);
  }
  loadAssignees() {
    return Promise.resolve([
      { id: 'u1', email: 'a@b.c', firstName: 'Alice', lastName: 'Dupont' },
    ]);
  }
}

function fakeTask(extra: Record<string, unknown> = {}): Task {
  return {
    id: 'task-test',
    number: 42,
    title: 'Test Task Title',
    description: 'A test description',
    status: 'in-progress',
    type: 'Frontend',
    nature: 'Bug',
    priority: 'Haute',
    points: 3,
    estimatedHours: 4,
    projectId: 'proj-1',
    userStoryId: null,
    epicId: null,
    sprintId: null,
    createdById: 'user-2',
    dueDate: null,
    createdAt: '2025-01-20T01:00:00Z',
    updatedAt: '2025-01-20T01:00:00Z',
    ...extra,
  } as unknown as Task;
}

describe('Integration | TaskDetailModal', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest('renders details tab by default', async function ({ context }) {
    initializeTestApp(context.owner);
    context.owner.register('service:tasks', FakeTasksService);
    const noop = () => {};
    const task = fakeTask();
    await render(
      <template><TaskDetailModal @task={{task}} @onClose={{noop}} /></template>
    );
    const text = document.body.textContent ?? '';
    expect(text).toContain('#42');
    expect(text).toContain('Test Task Title');
    expect(text).toContain('A test description');
    expect(text).toContain('Description');
    expect(text).toContain('Critères');
  });

  renderingTest('switches to comments tab', async function ({ context }) {
    initializeTestApp(context.owner);
    context.owner.register('service:tasks', FakeTasksService);
    const noop = () => {};
    const task = fakeTask();
    await render(
      <template><TaskDetailModal @task={{task}} @onClose={{noop}} /></template>
    );
    const commentsTab = document.querySelector(
      '[data-test-tab="comments"]'
    ) as HTMLButtonElement;
    expect(commentsTab).toBeTruthy();
    await click(commentsTab);
    const content = document.querySelector(
      '[data-test-tab-content="comments"]'
    );
    expect(content).toBeTruthy();
    const text = content?.textContent ?? '';
    expect(text).toContain('Test comment');
  });

  renderingTest('switches to history tab', async function ({ context }) {
    initializeTestApp(context.owner);
    context.owner.register('service:tasks', FakeTasksService);
    const noop = () => {};
    const task = fakeTask();
    await render(
      <template><TaskDetailModal @task={{task}} @onClose={{noop}} /></template>
    );
    const historyTab = document.querySelector(
      '[data-test-tab="history"]'
    ) as HTMLButtonElement;
    expect(historyTab).toBeTruthy();
    await click(historyTab);
    const content = document.querySelector('[data-test-tab-content="history"]');
    expect(content).toBeTruthy();
    const text = content?.textContent ?? '';
    expect(text).toContain('status');
  });
});
