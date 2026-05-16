import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render } from '@ember/test-helpers';
import SprintHeader from '#src/components/sprint-header.gts';
import type { Sprint } from '#src/schemas/sprints.ts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

const sprintFixture: Sprint = {
  id: 'sprint-1',
  projectId: 'proj-1',
  name: 'Sprint 1 — Auth',
  goal: 'Finaliser le flow login',
  startDate: '2025-01-15',
  endDate: '2025-01-29',
  status: 'active',
  createdAt: '2025-01-15T00:00:00Z',
  updatedAt: '2025-01-15T00:00:00Z',
};

describe('Integration | SprintHeader', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest(
    'renders sprint name, dates, goal, and completion',
    async function ({ context }) {
      initializeTestApp(context.owner);
      await render(
        <template>
          <SprintHeader
            @sprint={{sprintFixture}}
            @pointsCompleted={{4}}
            @pointsTotal={{10}}
          />
        </template>
      );
      const text = document.body.textContent ?? '';
      expect(text).toContain('Sprint 1 — Auth');
      expect(text).toContain('Finaliser le flow login');
      expect(text).toContain('4/10 pts');
      expect(text).toContain('40% complete');
    }
  );
});
