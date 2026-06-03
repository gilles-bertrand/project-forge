import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render, click } from '@ember/test-helpers';
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import type Owner from '@ember/owner';
import DashboardBacklogTemplate from '#src/templates/dashboard/backlog.gts';
import type { Task } from '#src/schemas/tasks.ts';
import type { UserStory } from '#src/schemas/user-stories.ts';
import type { Epic } from '#src/schemas/epics.ts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

// Stands in for the route controller: a tracked `task` mirrors the bound query
// param, so setting it (as openTaskDetail does) reactively drives the modal.
class FakeController {
  @tracked task: string | null = null;
}

class FakeCurrentProjectService extends Service {
  currentProjectId: string | null = 'proj-1';
}
class FakeEpicsService extends Service {
  list: Epic[] = [];
}
class FakeUserStoriesService extends Service {
  list: UserStory[] = [];
  loadByProject() {
    return Promise.resolve([]);
  }
}
class FakeCurrentUserService extends Service {
  user = { id: 'user-2' };
}
class FakeCommentsService extends Service {
  loadByOwner() {
    return Promise.resolve([]);
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
  create() {
    return Promise.resolve({});
  }
  remove() {
    return Promise.resolve();
  }
}
// Serves both the backlog grid (`all`) and the task-detail modal load calls.
class FakeTasksService extends Service {
  all: Task[] = [];
  loadComments() {
    return Promise.resolve([]);
  }
  loadHistory() {
    return Promise.resolve([]);
  }
  loadAssignees() {
    return Promise.resolve([]);
  }
  loadProjectMembers() {
    return Promise.resolve([]);
  }
  loadByUserStory() {
    return Promise.resolve([]);
  }
  update(id: string, partial: Record<string, unknown>) {
    return Promise.resolve({ id, ...partial });
  }
  syncAssignees() {
    return Promise.resolve();
  }
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
function task(id: string, number: number, title: string): Task {
  return {
    id,
    number,
    title,
    description: 'desc',
    status: 'todo',
    type: 'Frontend',
    nature: 'Feature',
    priority: 'Moyenne',
    points: 1,
    estimatedHours: null,
    projectId: 'proj-1',
    userStoryId: 'us1',
    epicId: null,
    sprintId: null,
    createdById: 'user-2',
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

function setup(owner: Owner) {
  initializeTestApp(owner);
  owner.register('service:current-project', FakeCurrentProjectService);
  owner.register('service:epics', FakeEpicsService);
  owner.register('service:user-stories', FakeUserStoriesService);
  owner.register('service:tasks', FakeTasksService);
  owner.register('service:current-user', FakeCurrentUserService);
  owner.register('service:comments', FakeCommentsService);
  owner.register('service:attachments', FakeAttachmentsService);
  owner.register('service:acceptance-tests', FakeAcceptanceTestsService);

  (owner.lookup('service:epics') as FakeEpicsService).list = [
    epic('e1', 'Auth', '#FF0000'),
  ];
  (
    owner.lookup('service:user-stories') as unknown as FakeUserStoriesService
  ).list = [us('us1', 'Login flow', 'e1')];
  (owner.lookup('service:tasks') as unknown as FakeTasksService).all = [
    task('task-1', 42, 'Deep linked task'),
  ];
}

describe('Integration | Backlog task deep-link', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest(
    'opens the task-detail modal when the task query param is set on load',
    async function ({ context }) {
      setup(context.owner);
      // Simulate a shared URL: the bound query param is set before render.
      const controller = new FakeController();
      controller.task = 'task-1';

      await render(
        <template>
          <DashboardBacklogTemplate
            @model={{EMPTY_MODEL}}
            @controller={{controller}}
          />
        </template>
      );

      // The task-detail modal is shown (its tabs are unique to it).
      expect(document.querySelector('[data-test-tab="comments"]')).toBeTruthy();
      expect(document.body.textContent ?? '').toContain('#42');
      expect(document.body.textContent ?? '').toContain('Deep linked task');
    }
  );

  renderingTest(
    'shows no modal when the query param is absent',
    async function ({ context }) {
      setup(context.owner);
      const controller = new FakeController();

      await render(
        <template>
          <DashboardBacklogTemplate
            @model={{EMPTY_MODEL}}
            @controller={{controller}}
          />
        </template>
      );

      expect(document.querySelector('[data-test-tab="comments"]')).toBeFalsy();
    }
  );

  renderingTest(
    'clicking a task sets the query param and opens the modal',
    async function ({ context }) {
      setup(context.owner);
      const controller = new FakeController();

      await render(
        <template>
          <DashboardBacklogTemplate
            @model={{EMPTY_MODEL}}
            @controller={{controller}}
          />
        </template>
      );

      // Expand the US card to reveal its tasks, then open the task.
      await click('[data-test-us-card-toggle]');
      await click('[data-test-us-card-task="task-1"]');

      expect(controller.task).toBe('task-1');
      expect(document.querySelector('[data-test-tab="comments"]')).toBeTruthy();
    }
  );
});
