import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render, click } from '@ember/test-helpers';
import Service from '@ember/service';
import DashboardBacklogTemplate from '#src/templates/dashboard/backlog.gts';
import type { Task } from '#src/schemas/tasks.ts';
import type { UserStory } from '#src/schemas/user-stories.ts';
import type { Epic } from '#src/schemas/epics.ts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

class FakeCurrentProjectService extends Service {
  currentProjectId: string | null = 'proj-1';
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

function epic(id: string, title: string, color: string): Epic {
  return {
    id,
    title,
    description: '',
    notes: null,
    color,
    type: 'functional',
    value: null,
    rank: 0,
    projectId: 'proj-1',
    createdById: 'u1',
    status: 'todo',
    tags: [],
    createdAt: '',
    updatedAt: '',
  } as unknown as Epic;
}

function us(id: string, title: string, epicId: string | null): UserStory {
  return {
    id,
    title,
    description: '',
    notes: null,
    color: null,
    projectId: 'proj-1',
    epicId,
    sprintId: null,
    status: 'accepted',
    points: 3,
    priority: 'Moyenne',
    rank: 0,
    value: null,
    createdById: 'u1',
    tags: [],
    createdAt: '',
    updatedAt: '',
  } as unknown as UserStory;
}

function task(id: string, userStoryId: string | null): Task {
  return {
    id,
    number: 1,
    title: `Task ${id}`,
    description: '',
    status: 'todo',
    type: 'Frontend',
    nature: 'Feature',
    priority: 'Moyenne',
    points: 1,
    estimatedHours: null,
    projectId: 'proj-1',
    userStoryId,
    epicId: null,
    sprintId: null,
    createdById: 'u1',
    dueDate: null,
    createdAt: '',
    updatedAt: '',
  } as unknown as Task;
}

const EMPTY_MODEL = {
  epics: [] as Epic[],
  userStories: [] as UserStory[],
  tasks: [] as Task[],
};

function registerServices(
  owner: import('@ember/owner').default,
  data: { epics: Epic[]; userStories: UserStory[]; tasks: Task[] }
) {
  owner.register('service:current-project', FakeCurrentProjectService);
  owner.register('service:epics', FakeEpicsService);
  owner.register('service:user-stories', FakeUserStoriesService);
  owner.register('service:tasks', FakeTasksService);
  (owner.lookup('service:epics') as FakeEpicsService).list = data.epics;
  (owner.lookup('service:user-stories') as FakeUserStoriesService).list =
    data.userStories;
  (owner.lookup('service:tasks') as FakeTasksService).all = data.tasks;
}

describe('Integration | Template /backlog', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest(
    'renders title, new US button and empty state',
    async function ({ context }) {
      initializeTestApp(context.owner);
      registerServices(context.owner, {
        epics: [],
        userStories: [],
        tasks: [],
      });

      await render(
        <template><DashboardBacklogTemplate @model={{EMPTY_MODEL}} /></template>
      );

      const text = (document.body.textContent ?? '').replace(/\s+/g, ' ');
      expect(text).toContain('Backlog');
      expect(text).toContain('+ Nouvelle US');
      expect(text).toContain('Aucune user story dans le backlog.');
    }
  );

  renderingTest(
    'renders US cards grouped by epic with task counts',
    async function ({ context }) {
      initializeTestApp(context.owner);
      registerServices(context.owner, {
        epics: [
          epic('e1', 'Auth', '#FF0000'),
          epic('e2', 'Billing', '#00FF00'),
        ],
        userStories: [
          us('us1', 'Login flow', 'e1'),
          us('us2', 'Invoice list', 'e2'),
          us('us3', 'Orphan story', null),
        ],
        tasks: [task('t1', 'us1'), task('t2', 'us1'), task('t3', 'us2')],
      });

      await render(
        <template><DashboardBacklogTemplate @model={{EMPTY_MODEL}} /></template>
      );

      // Two epic groups + one orphan group = 3.
      expect(
        document.querySelectorAll('[data-test-backlog-epic-group]').length
      ).toBe(3);
      expect(
        document.querySelector('[data-test-backlog-epic-group="e1"]')
      ).toBeTruthy();
      expect(
        document.querySelector('[data-test-backlog-epic-group="none"]')
      ).toBeTruthy();

      // us1 has 2 tasks attached.
      const us1Card = document.querySelector(
        '[data-test-user-story-card="us1"]'
      );
      const count = us1Card?.querySelector(
        '[data-test-us-card-task-count]'
      )?.textContent;
      expect((count ?? '').replace(/\s+/g, ' ')).toContain('2 tâches');
    }
  );

  renderingTest(
    'epic filter narrows the visible stories',
    async function ({ context }) {
      initializeTestApp(context.owner);
      registerServices(context.owner, {
        epics: [
          epic('e1', 'Auth', '#FF0000'),
          epic('e2', 'Billing', '#00FF00'),
        ],
        userStories: [
          us('us1', 'Login flow', 'e1'),
          us('us2', 'Invoice list', 'e2'),
        ],
        tasks: [],
      });

      await render(
        <template><DashboardBacklogTemplate @model={{EMPTY_MODEL}} /></template>
      );

      expect(
        document.querySelector('[data-test-user-story-card="us2"]')
      ).toBeTruthy();

      await click('[data-test-backlog-epic-filter-toggle]');
      await click('[data-test-backlog-epic-option="e1"]');

      expect(
        document.querySelector('[data-test-user-story-card="us1"]')
      ).toBeTruthy();
      expect(
        document.querySelector('[data-test-user-story-card="us2"]')
      ).toBeFalsy();
    }
  );

  renderingTest(
    'collapsing an epic group hides its US cards',
    async function ({ context }) {
      initializeTestApp(context.owner);
      registerServices(context.owner, {
        epics: [epic('e1', 'Auth', '#FF0000')],
        userStories: [us('us1', 'Login flow', 'e1')],
        tasks: [],
      });

      await render(
        <template><DashboardBacklogTemplate @model={{EMPTY_MODEL}} /></template>
      );

      expect(
        document.querySelector('[data-test-user-story-card="us1"]')
      ).toBeTruthy();

      await click('[data-test-backlog-epic-collapse="e1"]');
      expect(
        document.querySelector('[data-test-user-story-card="us1"]')
      ).toBeFalsy();

      // Expand again via the global control.
      await click('[data-test-backlog-collapse-all]');
      expect(
        document.querySelector('[data-test-user-story-card="us1"]')
      ).toBeTruthy();
    }
  );
});
