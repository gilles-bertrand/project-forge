import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render } from '@ember/test-helpers';
import Service from '@ember/service';
import DashboardBacklogTemplate from '#src/templates/dashboard/backlog.gts';
import type { Task } from '#src/schemas/tasks.ts';
import type { UserStory } from '#src/schemas/user-stories.ts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

class FakeCurrentProjectService extends Service {
  currentProjectId = 'proj-1';
}

class FakeTasksService extends Service {
  backlog: Task[] = [];
}

class FakeUserStoriesService extends Service {
  list: UserStory[] = [];
}

describe('Integration | Template /backlog', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest(
    'Renders title, disabled new task button, and empty state',
    async function ({ context }) {
      initializeTestApp(context.owner);
      context.owner.register(
        'service:current-project',
        FakeCurrentProjectService
      );
      context.owner.register('service:tasks', FakeTasksService);
      context.owner.register('service:user-stories', FakeUserStoriesService);

      const model = { tasks: [] as Task[], userStories: [] as UserStory[] };
      await render(
        <template><DashboardBacklogTemplate @model={{model}} /></template>
      );

      const text = document.body.textContent ?? '';
      expect(text).toContain('Backlog');
      expect(text).toContain('+ Nouvelle tâche');
      expect(text).toContain('Aucune tâche dans le backlog.');
    }
  );

  renderingTest(
    'Renders task rows when tasks present',
    async function ({ context }) {
      initializeTestApp(context.owner);
      context.owner.register(
        'service:current-project',
        FakeCurrentProjectService
      );
      context.owner.register('service:tasks', FakeTasksService);
      context.owner.register('service:user-stories', FakeUserStoriesService);

      const task = {
        id: 't1',
        number: 42,
        title: 'Backlog Task',
        type: 'Frontend',
        nature: 'Bug',
        status: 'todo',
        priority: 'Haute',
        points: 3,
        estimatedHours: null,
        projectId: 'proj-1',
        userStoryId: null,
        epicId: null,
        sprintId: null,
        createdById: 'u1',
        dueDate: null,
        createdAt: '',
        updatedAt: '',
        description: '',
      } as unknown as Task;

      const model = { tasks: [task], userStories: [] as UserStory[] };
      await render(
        <template><DashboardBacklogTemplate @model={{model}} /></template>
      );

      const text = document.body.textContent ?? '';
      expect(text).toContain('Backlog Task');
      expect(text).toContain('#42');
    }
  );
});
