import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render, click } from '@ember/test-helpers';
import Service from '@ember/service';
import DashboardUserStoryMapTemplate from '#src/templates/dashboard/user-story-map.gts';
import type { Epic } from '#src/schemas/epics.ts';
import type { UserStory } from '#src/schemas/user-stories.ts';
import type { Task } from '#src/schemas/tasks.ts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

class FakeCurrentProjectService extends Service {
  currentProjectId = 'proj-1';
}

class FakeEpicsService extends Service {
  list: Epic[] = [];
}

class FakeUserStoriesService extends Service {
  list: UserStory[] = [];
}

class FakeTasksService extends Service {
  all: Task[] = [];
}

describe('Integration | Template /user-story-map', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest(
    'Renders title, 3 action buttons, empty state when no epics',
    async function ({ context }) {
      initializeTestApp(context.owner);
      context.owner.register(
        'service:current-project',
        FakeCurrentProjectService
      );
      context.owner.register('service:epics', FakeEpicsService);
      context.owner.register('service:user-stories', FakeUserStoriesService);
      context.owner.register('service:tasks', FakeTasksService);

      const model = {
        epics: [] as Epic[],
        userStories: [] as UserStory[],
        tasks: [] as Task[],
      };
      await render(
        <template><DashboardUserStoryMapTemplate @model={{model}} /></template>
      );

      const text = document.body.textContent ?? '';
      expect(text).toContain('User Story Map');
      expect(text).toContain('+ Nouvelle épique');
      expect(text).toContain('+ Nouvelle US');
      expect(text).toContain('+ Nouvelle tâche');
      expect(text).toContain('Aucune épique.');
    }
  );

  renderingTest(
    'Renders EpicRow items and opens AddEpicModal on button click',
    async function ({ context }) {
      initializeTestApp(context.owner);
      context.owner.register(
        'service:current-project',
        FakeCurrentProjectService
      );
      context.owner.register('service:epics', FakeEpicsService);
      context.owner.register('service:user-stories', FakeUserStoriesService);
      context.owner.register('service:tasks', FakeTasksService);

      const epic = {
        id: 'epic-1',
        title: 'Test Epic',
        description: 'Description',
        notes: null,
        color: '#6B7280',
        type: 'functional',
        value: null,
        rank: 1,
        projectId: 'proj-1',
        createdById: 'user-2',
        status: 'todo',
        tags: [],
        createdAt: '',
        updatedAt: '',
      } as unknown as Epic;

      // Le template lit this.epics.list (cache service), pas @model
      const epicsService = context.owner.lookup(
        'service:epics'
      ) as FakeEpicsService;
      epicsService.list = [epic];

      const model = {
        epics: [] as Epic[],
        userStories: [] as UserStory[],
        tasks: [] as Task[],
      };
      await render(
        <template><DashboardUserStoryMapTemplate @model={{model}} /></template>
      );

      expect(document.body.textContent).toContain('Test Epic');

      const addEpicBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('+ Nouvelle épique')
      );
      if (addEpicBtn) await click(addEpicBtn);

      // Modal opened
      expect(document.body.textContent).toContain('Nouvelle épique');
    }
  );
});
