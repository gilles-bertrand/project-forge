import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { click, fillIn, render } from '@ember/test-helpers';
import Service from '@ember/service';
import TaskDetailModal from '#src/components/task-detail-modal.gts';
import type { Task } from '#src/schemas/tasks.ts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

class FakeCommentsService extends Service {
  loadByOwner() {
    return Promise.resolve([
      {
        id: 'c1',
        ownerType: 'task',
        ownerId: 'task-test',
        userId: 'user-2',
        content: 'Test comment',
        type: 'comment',
        metadata: null,
        createdAt: '2025-01-01T00:00:00Z',
      },
    ]);
  }
  create(_ownerType: string, ownerId: string, payload: { content: string }) {
    return Promise.resolve({
      id: 'c-new',
      ownerType: 'task',
      ownerId,
      userId: 'user-2',
      content: payload.content,
      type: 'comment',
      metadata: null,
      createdAt: '2025-02-01T00:00:00Z',
    });
  }
  update(commentId: string, content: string) {
    return Promise.resolve({
      id: commentId,
      ownerType: 'task',
      ownerId: 'task-test',
      userId: 'user-2',
      content,
      type: 'comment',
      metadata: null,
      createdAt: '2025-01-01T00:00:00Z',
    });
  }
  remove() {
    return Promise.resolve();
  }
}

class FakeAttachmentsService extends Service {
  loadByOwner() {
    return Promise.resolve([]);
  }
  upload() {
    return Promise.resolve(null);
  }
  remove() {
    return Promise.resolve();
  }
}

class FakeCurrentUserService extends Service {
  user = { id: 'user-2' };
}

class FakeTasksService extends Service {
  loadComments() {
    return Promise.resolve([]);
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
    context.owner.register('service:comments', FakeCommentsService);
    context.owner.register('service:attachments', FakeAttachmentsService);
    context.owner.register('service:current-user', FakeCurrentUserService);
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
    context.owner.register('service:comments', FakeCommentsService);
    context.owner.register('service:attachments', FakeAttachmentsService);
    context.owner.register('service:current-user', FakeCurrentUserService);
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
    context.owner.register('service:comments', FakeCommentsService);
    context.owner.register('service:attachments', FakeAttachmentsService);
    context.owner.register('service:current-user', FakeCurrentUserService);
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

  renderingTest('posts a new comment', async function ({ context }) {
    initializeTestApp(context.owner);
    context.owner.register('service:tasks', FakeTasksService);
    context.owner.register('service:comments', FakeCommentsService);
    context.owner.register('service:attachments', FakeAttachmentsService);
    context.owner.register('service:current-user', FakeCurrentUserService);
    const noop = () => {};
    const task = fakeTask();
    await render(
      <template><TaskDetailModal @task={{task}} @onClose={{noop}} /></template>
    );
    await click(
      document.querySelector('[data-test-tab="comments"]') as HTMLButtonElement
    );
    await fillIn('[data-test-comment-new-input]', 'Mon nouveau commentaire');
    await click(
      document.querySelector('[data-test-comment-post]') as HTMLButtonElement
    );
    const content =
      document.querySelector('[data-test-tab-content="comments"]')
        ?.textContent ?? '';
    expect(content).toContain('Mon nouveau commentaire');
  });
});
