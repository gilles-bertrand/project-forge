import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render } from '@ember/test-helpers';
import Service from '@ember/service';
import AcceptanceTestList from '#src/components/acceptance-test-list.gts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

class FakeCurrentUserService extends Service {
  user = { id: 'user-2' };
}

class FakeAcceptanceTestsService extends Service {
  byTaskCalls: string[] = [];
  byStoryCalls: string[] = [];
  loadByTask(taskId: string) {
    this.byTaskCalls.push(taskId);
    return Promise.resolve([
      {
        id: 'at-1',
        userStoryId: null,
        taskId,
        name: 'Critère task',
        description: '',
        state: 'to-check',
        rank: 0,
        createdById: null,
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      },
    ]);
  }
  loadByStory(storyId: string) {
    this.byStoryCalls.push(storyId);
    return Promise.resolve([]);
  }
  create() {
    return Promise.resolve({});
  }
  createOnTask() {
    return Promise.resolve({});
  }
  update() {
    return Promise.resolve({});
  }
  remove() {
    return Promise.resolve();
  }
}

describe('Integration | AcceptanceTestList (polymorphic)', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  // T8 (bloquant) — @ownerType="task" charge via loadByTask
  renderingTest(
    'loads task-scoped criteria via loadByTask',
    async function ({ context }) {
      initializeTestApp(context.owner);
      context.owner.register(
        'service:acceptance-tests',
        FakeAcceptanceTestsService
      );
      context.owner.register('service:current-user', FakeCurrentUserService);
      const at = context.owner.lookup(
        'service:acceptance-tests'
      ) as unknown as FakeAcceptanceTestsService;

      const ownerId = 'task-99';
      await render(
        <template>
          <AcceptanceTestList @ownerType="task" @ownerId={{ownerId}} />
        </template>
      );

      expect(at.byTaskCalls).toEqual(['task-99']);
      expect(at.byStoryCalls).toEqual([]);
      const text = document.body.textContent ?? '';
      expect(text).toContain('Critère task');
    }
  );

  renderingTest(
    'loads story-scoped criteria via loadByStory',
    async function ({ context }) {
      initializeTestApp(context.owner);
      context.owner.register(
        'service:acceptance-tests',
        FakeAcceptanceTestsService
      );
      context.owner.register('service:current-user', FakeCurrentUserService);
      const at = context.owner.lookup(
        'service:acceptance-tests'
      ) as unknown as FakeAcceptanceTestsService;

      const ownerId = 'story-7';
      await render(
        <template>
          <AcceptanceTestList @ownerType="user-story" @ownerId={{ownerId}} />
        </template>
      );

      expect(at.byStoryCalls).toEqual(['story-7']);
      expect(at.byTaskCalls).toEqual([]);
    }
  );
});
