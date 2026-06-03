import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render, click, fillIn } from '@ember/test-helpers';
import BacklogEpicFilter from '#src/components/backlog-epic-filter.gts';
import type { Epic } from '#src/schemas/epics.ts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

function fakeEpic(id: string, title: string, color: string): Epic {
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

describe('Integration | BacklogEpicFilter', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest(
    'opens on click, reports selection and reset',
    async function ({ context }) {
      initializeTestApp(context.owner);
      const epics = [
        fakeEpic('e1', 'Auth', '#FF0000'),
        fakeEpic('e2', 'Billing', '#00FF00'),
      ];
      const selected: Array<string | null> = [];
      const onSelect = (id: string | null) => selected.push(id);

      await render(
        <template>
          <BacklogEpicFilter
            @epics={{epics}}
            @activeEpicId={{null}}
            @onSelect={{onSelect}}
          />
        </template>
      );

      // Closed by default.
      expect(
        document.querySelector('[data-test-backlog-epic-option="e1"]')
      ).toBeFalsy();

      await click('[data-test-backlog-epic-filter-toggle]');
      expect(
        document.querySelector('[data-test-backlog-epic-option="e1"]')
      ).toBeTruthy();
      expect(
        document.querySelector('[data-test-backlog-epic-option="e2"]')
      ).toBeTruthy();

      await click('[data-test-backlog-epic-option="e2"]');
      expect(selected.at(-1)).toBe('e2');
      // Closes after select.
      expect(
        document.querySelector('[data-test-backlog-epic-option="e1"]')
      ).toBeFalsy();

      await click('[data-test-backlog-epic-filter-toggle]');
      await click('[data-test-backlog-epic-option-all]');
      expect(selected.at(-1)).toBe(null);
    }
  );

  renderingTest(
    'filters the epic list by the search query',
    async function ({ context }) {
      initializeTestApp(context.owner);
      const epics = [
        fakeEpic('e1', 'Authentication', '#FF0000'),
        fakeEpic('e2', 'Billing', '#00FF00'),
      ];
      const onSelect = () => {};

      await render(
        <template>
          <BacklogEpicFilter
            @epics={{epics}}
            @activeEpicId={{null}}
            @onSelect={{onSelect}}
          />
        </template>
      );

      await click('[data-test-backlog-epic-filter-toggle]');
      await fillIn('[data-test-backlog-epic-search]', 'bill');

      expect(
        document.querySelector('[data-test-backlog-epic-option="e2"]')
      ).toBeTruthy();
      expect(
        document.querySelector('[data-test-backlog-epic-option="e1"]')
      ).toBeFalsy();
    }
  );
});
