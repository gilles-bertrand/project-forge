import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render } from '@ember/test-helpers';
import TimeEntriesTable from '#src/components/time-entries-table.gts';
import type { TimeEntryData } from '#src/services/time-entries.ts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

function makeEntry(extra: Partial<TimeEntryData> = {}): TimeEntryData {
  return {
    id: 'te-1',
    taskId: 'task-1',
    userId: 'u1',
    projectId: 'proj-1',
    hours: 2.5,
    date: '2025-05-16',
    description: 'Test entry description',
    createdAt: '2025-05-16T00:00:00Z',
    ...extra,
  };
}

describe('Integration | TimeEntriesTable', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest('renders empty state when no entries', async function ({ context }) {
    initializeTestApp(context.owner);
    const entries: TimeEntryData[] = [];
    const noop = () => {};
    await render(
      <template>
        <TimeEntriesTable
          @entries={{entries}}
          @onEditEntry={{noop}}
          @onDeleteEntry={{noop}}
        />
      </template>
    );
    const text = document.body.textContent ?? '';
    expect(text).toContain('Aucune entrée de temps enregistrée');
  });

  renderingTest('renders entry rows with data', async function ({ context }) {
    initializeTestApp(context.owner);
    const entries = [
      makeEntry({ id: 'te-1', hours: 3, date: '2025-05-16' }),
      makeEntry({ id: 'te-2', hours: 1.5, taskId: 'task-2', date: '2025-05-15' }),
    ];
    const noop = () => {};
    await render(
      <template>
        <TimeEntriesTable
          @entries={{entries}}
          @onEditEntry={{noop}}
          @onDeleteEntry={{noop}}
        />
      </template>
    );
    const text = document.body.textContent ?? '';
    expect(text).toContain('3 h');
    expect(text).toContain('1.5 h');
    expect(text).toContain('#task-1');
    expect(text).toContain('#task-2');
    expect(text).not.toContain('Aucune entrée de temps enregistrée');
  });
});
