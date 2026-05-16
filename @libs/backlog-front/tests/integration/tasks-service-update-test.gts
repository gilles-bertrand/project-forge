import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import Service from '@ember/service';
import TasksService from '#src/services/tasks.ts';
import type { Task } from '#src/schemas/tasks.ts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

function fakeTask(extra: Record<string, unknown> = {}): Task {
  return {
    id: 'task-1',
    number: 1,
    title: 'T1',
    description: '',
    status: 'todo',
    type: 'Frontend',
    nature: 'Feature',
    priority: 'Moyenne',
    points: 1,
    estimatedHours: null,
    projectId: 'proj-1',
    userStoryId: null,
    epicId: null,
    sprintId: null,
    createdById: 'user-1',
    dueDate: null,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...extra,
  } as unknown as Task;
}

interface RecordedCall {
  method: string;
  url: string;
}

class FakeStoreService extends Service {
  calls: RecordedCall[] = [];

  request<T>(req: { method: string; url: string }): Promise<{ content: T }> {
    this.calls.push({ method: req.method, url: req.url });
    if (req.method === 'PATCH') {
      return Promise.resolve({
        content: { data: fakeTask({ status: 'done' }) } as T,
      });
    }
    if (req.method === 'GET') {
      return Promise.resolve({ content: { data: [fakeTask()] } as T });
    }
    return Promise.resolve({ content: {} as T });
  }
}

describe('Integration | TasksService.update', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest(
    'update with refresh:false does NOT call loadAllByProject',
    async function ({ context }) {
      initializeTestApp(context.owner);
      context.owner.register('service:store', FakeStoreService);
      context.owner.register('service:tasks', TasksService);
      const service = context.owner.lookup('service:tasks') as TasksService;
      const store = context.owner.lookup(
        'service:store'
      ) as unknown as FakeStoreService;
      service.all = [fakeTask()];

      await service.update('task-1', { status: 'done' }, { refresh: false });

      const patchCalls = store.calls.filter((c) => c.method === 'PATCH');
      const getCalls = store.calls.filter((c) => c.method === 'GET');
      expect(patchCalls.length).toBe(1);
      expect(getCalls.length).toBe(0);
    }
  );

  renderingTest(
    'update without opts DOES call loadAllByProject (default refresh:true)',
    async function ({ context }) {
      initializeTestApp(context.owner);
      context.owner.register('service:store', FakeStoreService);
      context.owner.register('service:tasks', TasksService);
      const service = context.owner.lookup('service:tasks') as TasksService;
      const store = context.owner.lookup(
        'service:store'
      ) as unknown as FakeStoreService;
      service.all = [fakeTask()];

      await service.update('task-1', { status: 'done' });

      const patchCalls = store.calls.filter((c) => c.method === 'PATCH');
      const getCalls = store.calls.filter((c) => c.method === 'GET');
      expect(patchCalls.length).toBe(1);
      expect(getCalls.length).toBe(1);
    }
  );
});
