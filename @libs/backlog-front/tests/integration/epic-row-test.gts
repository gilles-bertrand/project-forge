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
    projectId: 'proj-1',
    status: 'todo',
    createdAt: '',
    updatedAt: '',
  } as Epic;
}

function fakeUS(epicId: string): UserStory {
  return {
    id: 'us-test',
    title: 'Story in Epic',
    epicId,
    projectId: 'proj-1',
    status: 'todo',
    points: 3,
    priority: 1,
    description: '',
    createdAt: '',
    updatedAt: '',
  } as UserStory;
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
