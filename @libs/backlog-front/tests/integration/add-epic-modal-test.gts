import {
  describe,
  expect as hardExpect,
  vi,
  beforeEach,
  afterEach,
} from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render } from '@ember/test-helpers';
import Service from '@ember/service';
import AddEpicModal from '#src/components/add-epic-modal.gts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

class FakeEpicsService extends Service {
  list = [];
  create = vi.fn().mockResolvedValue({});
}

class FakeCurrentProjectService extends Service {
  currentProjectId = 'proj-1';
}

describe('Integration | AddEpicModal', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    ) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  renderingTest(
    'Renders form fields and actions',
    async function ({ context }) {
      initializeTestApp(context.owner);
      context.owner.register('service:epics', FakeEpicsService);
      context.owner.register(
        'service:current-project',
        FakeCurrentProjectService
      );

      const onClose = vi.fn();
      await render(<template><AddEpicModal @onClose={{onClose}} /></template>);

      const text = document.body.textContent ?? '';
      expect(text).toContain('Nouvelle épique');
      expect(text).toContain('Titre');
      expect(text).toContain('Description');
      expect(text).toContain('Statut initial');
      expect(text).toContain('Annuler');
      expect(text).toContain("Créer l'épique");
    }
  );

  renderingTest('Status options come from i18n', async function ({ context }) {
    initializeTestApp(context.owner);
    context.owner.register('service:epics', FakeEpicsService);
    context.owner.register(
      'service:current-project',
      FakeCurrentProjectService
    );

    const onClose = vi.fn();
    await render(<template><AddEpicModal @onClose={{onClose}} /></template>);

    const options = Array.from(
      document.querySelectorAll('#epic-status option')
    ).map((o) => o.textContent?.trim());
    expect(options).toEqual(['À faire', 'En cours', 'Terminé']);
  });
});
