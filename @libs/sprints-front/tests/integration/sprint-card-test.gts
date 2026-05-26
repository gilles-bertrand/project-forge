import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render } from '@ember/test-helpers';
import SprintCard from '#src/components/sprint-card.gts';
import type { SprintData } from '#src/services/sprints.ts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

function makeSprint(extra: Partial<SprintData> = {}): SprintData {
  return {
    id: 'sprint-1',
    number: 1,
    name: 'Sprint 1 — Auth',
    goal: 'Login complet',
    projectId: 'proj-1',
    startDate: '2025-01-15',
    endDate: '2025-01-29',
    status: 'active',
    velocityPoints: 10,
    completedPoints: 4,
    createdAt: '2025-01-15T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
    ...extra,
  };
}

describe('Integration | SprintCard', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest(
    'renders active sprint with progress and stop button',
    async function ({ context }) {
      initializeTestApp(context.owner);
      const sprint = makeSprint({ status: 'active' });
      const tasks: never[] = [];
      const noop = () => {};
      await render(
        <template>
          <SprintCard
            @sprint={{sprint}}
            @tasks={{tasks}}
            @onStop={{noop}}
          />
        </template>
      );
      const text = document.body.textContent ?? '';
      expect(text).toContain('Sprint 1 — Auth');
      expect(text).toContain('En cours');
      expect(text).toContain('Login complet');
      expect(text).toContain('Stopper');
      expect(text).not.toContain('Planifier');
    }
  );

  renderingTest(
    'renders planned sprint with start button and empty tasks',
    async function ({ context }) {
      initializeTestApp(context.owner);
      const sprint = makeSprint({ status: 'planned', completedPoints: 0 });
      const tasks: never[] = [];
      const noop = () => {};
      await render(
        <template>
          <SprintCard
            @sprint={{sprint}}
            @tasks={{tasks}}
            @onStart={{noop}}
          />
        </template>
      );
      const text = document.body.textContent ?? '';
      expect(text).toContain('Sprint 1 — Auth');
      expect(text).toContain('À faire');
      expect(text).toContain('Planifier');
      expect(text).toContain('Aucune tâche assignée');
      expect(text).not.toContain('Stopper');
    }
  );
});
