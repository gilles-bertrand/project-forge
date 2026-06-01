import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { click, fillIn, render } from '@ember/test-helpers';
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import TaskDetailModal from '#src/components/task-detail-modal.gts';
import type { Task } from '#src/schemas/tasks.ts';
import type Owner from '@ember/owner';
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

class FakeAcceptanceTestsService extends Service {
  loadByTask() {
    return Promise.resolve([]);
  }
  loadByStory() {
    return Promise.resolve([]);
  }
  createOnTask() {
    return Promise.resolve({});
  }
  create() {
    return Promise.resolve({});
  }
  update() {
    return Promise.resolve({});
  }
  remove() {
    return Promise.resolve();
  }
}

class FakeUserStoriesService extends Service {
  @tracked list: { id: string; title: string }[] = [];
  loadByProject() {
    return Promise.resolve([]);
  }
}

class FakeCurrentUserService extends Service {
  user = { id: 'user-2' };
}

class FakeTasksService extends Service {
  updateCalls: Array<{ id: string; partial: Record<string, unknown> }> = [];
  syncCalls: Array<{ id: string; desired: string[]; current: string[] }> = [];

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
    // Forme réelle du serializer task-assignees.
    return Promise.resolve([
      {
        id: 'ta1',
        taskId: 'task-test',
        userId: 'u1',
        assignedAt: '2025-01-01',
      },
    ]);
  }
  loadProjectMembers() {
    return Promise.resolve([
      { id: 'u1', firstName: 'Alice', lastName: 'Dupont', color: null },
      { id: 'u2', firstName: 'Bob', lastName: 'Martin', color: null },
    ]);
  }
  update(id: string, partial: Record<string, unknown>) {
    this.updateCalls.push({ id, partial });
    return Promise.resolve({ id, ...partial });
  }
  syncAssignees(id: string, desired: string[], current: string[]) {
    this.syncCalls.push({ id, desired, current });
    return Promise.resolve();
  }
  addAssignee() {
    return Promise.resolve();
  }
  removeAssignee() {
    return Promise.resolve();
  }
}

function registerServices(owner: Owner) {
  owner.register('service:tasks', FakeTasksService);
  owner.register('service:comments', FakeCommentsService);
  owner.register('service:attachments', FakeAttachmentsService);
  owner.register('service:acceptance-tests', FakeAcceptanceTestsService);
  owner.register('service:user-stories', FakeUserStoriesService);
  owner.register('service:current-user', FakeCurrentUserService);
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
    registerServices(context.owner);
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
    registerServices(context.owner);
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
    registerServices(context.owner);
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
    registerServices(context.owner);
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

  // T6 (bloquant) — bascule en édition, modifie le titre, save → tasks.update appelé
  renderingTest(
    'enters edit mode, edits title, saves → tasks.update called with payload',
    async function ({ context }) {
      initializeTestApp(context.owner);
      registerServices(context.owner);
      const tasks = context.owner.lookup(
        'service:tasks'
      ) as unknown as FakeTasksService;
      const noop = () => {};
      const task = fakeTask();
      await render(
        <template>
          <TaskDetailModal @task={{task}} @onClose={{noop}} />
        </template>
      );

      // pas de bouton save tant qu'on n'est pas en édition
      expect(document.querySelector('[data-test-task-save]')).toBeNull();

      await click(
        document.querySelector('[data-test-task-edit]') as HTMLButtonElement
      );
      // badge mode édition + input titre visibles
      expect(
        document.querySelector('[data-test-edit-mode-badge]')
      ).toBeTruthy();
      await fillIn('[data-test-task-title-input]', 'Titre modifié');
      await click(
        document.querySelector('[data-test-task-save]') as HTMLButtonElement
      );

      expect(tasks.updateCalls.length).toBe(1);
      expect(tasks.updateCalls[0]?.id).toBe('task-test');
      expect(tasks.updateCalls[0]?.partial['title']).toBe('Titre modifié');
      expect(tasks.updateCalls[0]?.partial['status']).toBe('in-progress');
      expect(tasks.updateCalls[0]?.partial['priority']).toBe('Haute');
    }
  );

  // T7 (bloquant) — ajout/retrait d'un assigné → syncAssignees calcule le bon diff
  renderingTest(
    'toggling assignees computes the right add/remove diff on save',
    async function ({ context }) {
      initializeTestApp(context.owner);
      registerServices(context.owner);
      const tasks = context.owner.lookup(
        'service:tasks'
      ) as unknown as FakeTasksService;
      const noop = () => {};
      const task = fakeTask();
      await render(
        <template>
          <TaskDetailModal @task={{task}} @onClose={{noop}} />
        </template>
      );

      await click(
        document.querySelector('[data-test-task-edit]') as HTMLButtonElement
      );
      // ouvre le dropdown d'assignation
      await click(
        document.querySelector(
          '[data-test-assignee-toggle]'
        ) as HTMLButtonElement
      );
      // u1 est déjà assigné (loadAssignees), on l'enlève et on ajoute u2
      await click(
        document.querySelector(
          '[data-test-assignee-checkbox="u1"]'
        ) as HTMLInputElement
      );
      await click(
        document.querySelector(
          '[data-test-assignee-checkbox="u2"]'
        ) as HTMLInputElement
      );
      await click(
        document.querySelector('[data-test-task-save]') as HTMLButtonElement
      );

      expect(tasks.syncCalls.length).toBe(1);
      const call = tasks.syncCalls[0]!;
      expect(call.current).toEqual(['u1']);
      expect([...call.desired].sort()).toEqual(['u2']);
    }
  );
});
