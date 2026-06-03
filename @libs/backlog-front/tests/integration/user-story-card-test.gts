import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render, click } from '@ember/test-helpers';
import UserStoryCard from '#src/components/user-story-card.gts';
import type { UserStory } from '#src/schemas/user-stories.ts';
import type { Epic } from '#src/schemas/epics.ts';
import type { Task } from '#src/schemas/tasks.ts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

function fakeUS(over: Partial<Record<string, unknown>> = {}): UserStory {
  return {
    id: 'us-1',
    title: 'My User Story',
    description: '',
    notes: null,
    color: null,
    projectId: 'proj-1',
    epicId: 'epic-1',
    sprintId: null,
    status: 'accepted',
    points: 5,
    priority: 'Haute',
    rank: 0,
    value: null,
    createdById: 'u1',
    tags: [],
    createdAt: '',
    updatedAt: '',
    ...over,
  } as unknown as UserStory;
}

function fakeEpic(over: Partial<Record<string, unknown>> = {}): Epic {
  return {
    id: 'epic-1',
    title: 'Authentication',
    description: '',
    notes: null,
    color: '#FF8800',
    type: 'functional',
    value: null,
    rank: 0,
    projectId: 'proj-1',
    createdById: 'u1',
    status: 'todo',
    tags: [],
    createdAt: '',
    updatedAt: '',
    ...over,
  } as unknown as Epic;
}

function fakeTask(id: string, title: string): Task {
  return {
    id,
    number: 12,
    title,
    description: '',
    status: 'todo',
    type: 'Frontend',
    nature: 'Feature',
    priority: 'Moyenne',
    points: 1,
    estimatedHours: null,
    projectId: 'proj-1',
    userStoryId: 'us-1',
    epicId: null,
    sprintId: null,
    createdById: 'u1',
    dueDate: null,
    createdAt: '',
    updatedAt: '',
  } as unknown as Task;
}

describe('Integration | UserStoryCard', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest(
    'shows title, priority, epic accent and task count; tasks hidden when collapsed',
    async function ({ context }) {
      initializeTestApp(context.owner);
      const us = fakeUS();
      const epic = fakeEpic();
      const tasks = [fakeTask('t1', 'Form UI'), fakeTask('t2', 'API call')];
      const noop = () => {};

      await render(
        <template>
          <UserStoryCard
            @userStory={{us}}
            @epic={{epic}}
            @tasks={{tasks}}
            @expanded={{false}}
            @onToggle={{noop}}
          />
        </template>
      );

      expect(
        document
          .querySelector('[data-test-us-card-epic-color]')
          ?.getAttribute('data-test-us-card-epic-color')
      ).toBe('#FF8800');
      const text = (document.body.textContent ?? '').replace(/\s+/g, ' ');
      expect(text).toContain('My User Story');
      expect(text).toContain('Authentication');
      expect(text).toContain('2 tâches');
      expect(
        document.querySelector('[data-test-us-card-priority="Haute"]')
      ).toBeTruthy();
      // Collapsed: tasks not rendered.
      expect(document.querySelector('[data-test-us-card-tasks]')).toBeFalsy();
    }
  );

  renderingTest(
    'reveals tasks when expanded and opens a task on click',
    async function ({ context }) {
      initializeTestApp(context.owner);
      const us = fakeUS();
      const epic = fakeEpic();
      const tasks = [fakeTask('t1', 'Form UI')];
      const opened: string[] = [];
      const onOpenTask = (task: Task) => opened.push(task.id ?? '');
      const noop = () => {};

      await render(
        <template>
          <UserStoryCard
            @userStory={{us}}
            @epic={{epic}}
            @tasks={{tasks}}
            @expanded={{true}}
            @onToggle={{noop}}
            @onOpenTask={{onOpenTask}}
          />
        </template>
      );

      expect(document.querySelector('[data-test-us-card-tasks]')).toBeTruthy();
      const taskBtn = document.querySelector('[data-test-us-card-task="t1"]');
      expect(taskBtn).toBeTruthy();
      if (taskBtn) await click(taskBtn);
      expect(opened).toEqual(['t1']);
    }
  );

  renderingTest(
    'falls back to a neutral colour and "no epic" label when orphan',
    async function ({ context }) {
      initializeTestApp(context.owner);
      const us = fakeUS({ epicId: null });
      const noTasks: Task[] = [];
      const noop = () => {};

      await render(
        <template>
          <UserStoryCard
            @userStory={{us}}
            @epic={{null}}
            @tasks={{noTasks}}
            @expanded={{false}}
            @onToggle={{noop}}
          />
        </template>
      );

      expect(
        document
          .querySelector('[data-test-us-card-epic-color]')
          ?.getAttribute('data-test-us-card-epic-color')
      ).toBe('#6B7280');
      const text = (document.body.textContent ?? '').replace(/\s+/g, ' ');
      expect(text).toContain('Sans épique');
      expect(text).toContain('0 tâches');
    }
  );
});
