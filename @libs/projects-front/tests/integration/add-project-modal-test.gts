import { describe, expect as hardExpect, vi, beforeEach, afterEach } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render } from '@ember/test-helpers';
import Service from '@ember/service';
import AddProjectModal from '#src/components/add-project-modal.gts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

class FakeProjectsService extends Service {
  create = vi.fn().mockResolvedValue({});
  loadMembers = vi.fn().mockResolvedValue([]);
}

class FakeCurrentUserService extends Service {
  currentUser = { id: 'user-current' };
}

class FakeStore extends Service {
  // Surface minimale — non utilisée tant que submit n'est pas déclenché
}

describe('Integration | AddProjectModal', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  renderingTest(
    'Renders title, form fields and action buttons (fr-fr)',
    async function ({ context }) {
      initializeTestApp(context.owner, 'fr-fr');
      context.owner.register('service:projects', FakeProjectsService);
      context.owner.register('service:current-user', FakeCurrentUserService);
      context.owner.register('service:store', FakeStore);

      const onClose = vi.fn();
      await render(<template><AddProjectModal @onClose={{onClose}} /></template>);

      const text = document.body.textContent ?? '';
      expect(text).toContain('Nouveau projet');
      expect(text).toContain('Nom du projet');
      expect(text).toContain('Statut initial');
      expect(text).toContain('Description');
      expect(text).toContain('Responsable du projet');
      expect(text).toContain('Annuler');
      expect(text).toContain('Créer le projet');
    },
  );

  renderingTest(
    'Status options come from i18n keys (projects.status.*)',
    async function ({ context }) {
      initializeTestApp(context.owner, 'fr-fr');
      context.owner.register('service:projects', FakeProjectsService);
      context.owner.register('service:current-user', FakeCurrentUserService);
      context.owner.register('service:store', FakeStore);

      const onClose = vi.fn();
      await render(<template><AddProjectModal @onClose={{onClose}} /></template>);

      const options = Array.from(
        document.querySelectorAll('#proj-status option'),
      ).map((o) => o.textContent?.trim());
      expect(options).toEqual(['Planifié', 'Actif', 'En pause']);
    },
  );
});
