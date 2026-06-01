import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { click, render, fillIn } from '@ember/test-helpers';
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import AddTaskModal from '#src/components/add-task-modal.gts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;
// Avoid unused import warning while preserving the requested helper surface.
void click;

class FakeCurrentProject extends Service {
  currentProjectId = 'proj-1';
}

class FakeTasksService extends Service {
  @tracked all: unknown[] = [];
  created: Record<string, unknown> | null = null;
  create(payload: Record<string, unknown>) {
    this.created = payload;
    return Promise.resolve({ id: 'task-new', ...payload });
  }
  loadAllByProject() {
    return Promise.resolve([]);
  }
  loadProjectMembers() {
    return Promise.resolve([
      { id: 'u1', firstName: 'Alice', lastName: 'Dupont', color: null },
      { id: 'u2', firstName: 'Bob', lastName: 'Martin', color: null },
    ]);
  }
  syncAssignees() {
    return Promise.resolve();
  }
}

class FakeUserStoriesService extends Service {
  @tracked list: { id: string; title: string }[] = [
    { id: 'us-1', title: 'US 1' },
    { id: 'us-2', title: 'US 2' },
  ];
}

class FakeStore extends Service {
  request() {
    return Promise.resolve({
      content: {
        data: [
          {
            id: '1',
            attributes: {
              email: 'a@b.c',
              firstName: 'Alice',
              lastName: 'Dupont',
            },
          },
          {
            id: '2',
            attributes: {
              email: 'b@b.c',
              firstName: 'Bob',
              lastName: 'Martin',
            },
          },
        ],
      },
    });
  }
}

describe('Integration | AddTaskModal', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest('renders all required fields', async function ({ context }) {
    initializeTestApp(context.owner);
    context.owner.register('service:current-project', FakeCurrentProject);
    context.owner.register('service:tasks', FakeTasksService);
    context.owner.register('service:user-stories', FakeUserStoriesService);
    context.owner.register('service:store', FakeStore);
    const noop = () => {};
    await render(<template><AddTaskModal @onClose={{noop}} /></template>);
    const text = document.body.textContent ?? '';
    expect(text).toContain('Nouvelle tâche');
    expect(text).toContain('Titre');
    expect(text).toContain('Description');
    expect(text).toContain('Type');
    expect(text).toContain('Nature');
    expect(text).toContain('Priorité');
    expect(text).toContain('Points');
    expect(text).toContain('Temps estimé');
    expect(text).toContain('Assignés');
  });

  renderingTest(
    'disables submit when title is empty',
    async function ({ context }) {
      initializeTestApp(context.owner);
      context.owner.register('service:current-project', FakeCurrentProject);
      context.owner.register('service:tasks', FakeTasksService);
      context.owner.register('service:user-stories', FakeUserStoriesService);
      context.owner.register('service:store', FakeStore);
      const noop = () => {};
      await render(<template><AddTaskModal @onClose={{noop}} /></template>);
      const submitBtn = document.querySelector(
        'button[type="submit"]'
      ) as HTMLButtonElement;
      expect(submitBtn).toBeTruthy();
      expect(submitBtn.disabled).toBe(true);
      // Fill the title input
      const titleInput = document.querySelector(
        'input[type="text"]'
      ) as HTMLInputElement;
      await fillIn(titleInput, 'My new task');
      expect(submitBtn.disabled).toBe(false);
    }
  );
});
