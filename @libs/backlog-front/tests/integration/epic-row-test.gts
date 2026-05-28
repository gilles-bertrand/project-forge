import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render, click } from '@ember/test-helpers';
import EpicRow from '#src/components/epic-row.gts';
import type { Epic } from '#src/schemas/epics.ts';
import type { UserStory } from '#src/schemas/user-stories.ts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

function fakeEpic(): Epic {
  return {
    id: 'epic-test',
    title: 'Test Epic',
    description: 'Epic desc',
    notes: null,
    color: '#6B7280',
    type: 'functional',
    value: null,
    rank: 0,
    projectId: 'proj-1',
    createdById: 'user-2',
    status: 'todo',
    tags: [],
    createdAt: '',
    updatedAt: '',
  } as unknown as Epic;
}

function fakeUS(epicId: string): UserStory {
  return {
    id: 'us-test',
    title: 'Story in Epic',
    epicId,
    sprintId: null,
    projectId: 'proj-1',
    status: 'accepted',
    points: 3,
    priority: 'Moyenne',
    rank: 0,
    value: null,
    color: null,
    notes: null,
    createdById: 'user-2',
    tags: [],
    description: '',
    createdAt: '',
    updatedAt: '',
  } as unknown as UserStory;
}

describe('Integration | EpicRow', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest(
    'Renders epic title and is collapsed by default',
    async function ({ context }) {
      initializeTestApp(context.owner);
      const epic = fakeEpic();
      await render(<template><EpicRow @epic={{epic}} /></template>);

      const text = document.body.textContent ?? '';
      expect(text).toContain('Test Epic');
      expect(text).toContain('Épique');
      // Collapsed: no US visible
      expect(text).not.toContain('Story in Epic');
    }
  );

  renderingTest(
    'Expands to show user stories on click',
    async function ({ context }) {
      initializeTestApp(context.owner);
      const epic = fakeEpic();
      const userStories = [fakeUS('epic-test')];

      await render(
        <template>
          <EpicRow @epic={{epic}} @userStories={{userStories}} />
        </template>
      );

      // Before expand: Story not visible
      expect(document.body.textContent).not.toContain('Story in Epic');

      // Expand by clicking
      const btn = document.querySelector('[data-test-epic-row] button');
      if (btn) await click(btn);

      expect(document.body.textContent).toContain('Story in Epic');
    }
  );
});
