import { describe, expect as hardExpect, vi } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render, click } from '@ember/test-helpers';
import Service from '@ember/service';
import ProjectActionBar from '#src/components/project-action-bar.gts';
import type { Project } from '#src/schemas/projects.ts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

function fakeProject(): Project {
  return {
    id: 'p1',
    name: 'SprintForge',
    description: '',
    status: 'active',
    responsibleId: 'u1',
    createdById: 'u1',
    avatar: null,
    githubUrl: null,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  } as Project;
}

describe('Integration | ProjectActionBar', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest('renders 4 action buttons', async function ({ context }) {
    initializeTestApp(context.owner, 'fr-fr');

    const setCurrent = vi.fn();
    context.owner.register('service:current-project', class extends Service {
      setCurrent = setCurrent;
    });

    const project = fakeProject();
    await render(<template><ProjectActionBar @project={{project}} /></template>);

    expect(document.querySelector('[data-test-project-action-backlog]')).not.toBeNull();
    expect(document.querySelector('[data-test-project-action-kanban]')).not.toBeNull();
    expect(document.querySelector('[data-test-project-action-user-story-map]')).not.toBeNull();
    expect(document.querySelector('[data-test-project-action-sprints]')).not.toBeNull();
  });

  renderingTest(
    'clicking backlog button calls setCurrent and transitionTo dashboard.backlog',
    async function ({ context }) {
      initializeTestApp(context.owner, 'fr-fr');

      const setCurrent = vi.fn();
      context.owner.register('service:current-project', class extends Service {
        setCurrent = setCurrent;
      });

      const project = fakeProject();
      await render(<template><ProjectActionBar @project={{project}} /></template>);

      // Spy on the real router service (avoids replacing a built-in Ember service)
      const router = context.owner.lookup('service:router');
      const transitionTo = vi.spyOn(router, 'transitionTo').mockResolvedValue(undefined);

      await click('[data-test-project-action-backlog]');

      expect(setCurrent).toHaveBeenCalledWith('p1');
      expect(transitionTo).toHaveBeenCalledWith('dashboard.backlog');
    },
  );

  renderingTest(
    'clicking kanban button calls setCurrent and transitionTo dashboard.kanban',
    async function ({ context }) {
      initializeTestApp(context.owner, 'fr-fr');

      const setCurrent = vi.fn();
      context.owner.register('service:current-project', class extends Service {
        setCurrent = setCurrent;
      });

      const project = fakeProject();
      await render(<template><ProjectActionBar @project={{project}} /></template>);

      const router = context.owner.lookup('service:router');
      const transitionTo = vi.spyOn(router, 'transitionTo').mockResolvedValue(undefined);

      await click('[data-test-project-action-kanban]');

      expect(setCurrent).toHaveBeenCalledWith('p1');
      expect(transitionTo).toHaveBeenCalledWith('dashboard.kanban');
    },
  );

  renderingTest(
    'clicking user-story-map button calls setCurrent and transitionTo dashboard.user-story-map',
    async function ({ context }) {
      initializeTestApp(context.owner, 'fr-fr');

      const setCurrent = vi.fn();
      context.owner.register('service:current-project', class extends Service {
        setCurrent = setCurrent;
      });

      const project = fakeProject();
      await render(<template><ProjectActionBar @project={{project}} /></template>);

      const router = context.owner.lookup('service:router');
      const transitionTo = vi.spyOn(router, 'transitionTo').mockResolvedValue(undefined);

      await click('[data-test-project-action-user-story-map]');

      expect(setCurrent).toHaveBeenCalledWith('p1');
      expect(transitionTo).toHaveBeenCalledWith('dashboard.user-story-map');
    },
  );
});
