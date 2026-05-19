import { describe, expect as hardExpect, vi } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render } from '@ember/test-helpers';
import Service from '@ember/service';
import AddUserStoryModal from '#src/components/add-user-story-modal.gts';
import type { Epic } from '#src/schemas/epics.ts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

class FakeUserStoriesService extends Service {
  list = [];
  create = vi.fn().mockResolvedValue({});
}

class FakeEpicsService extends Service {
  list: Epic[] = [
    {
      id: 'epic-1',
      title: 'Epic One',
      description: '',
      projectId: 'proj-1',
      status: 'todo',
      createdAt: '',
      updatedAt: '',
    } as Epic,
  ];
}

class FakeCurrentProjectService extends Service {
  currentProjectId = 'proj-1';
}

describe('Integration | AddUserStoryModal', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest(
    'Renders form fields and epic select',
    async function ({ context }) {
      initializeTestApp(context.owner);
      context.owner.register('service:user-stories', FakeUserStoriesService);
      context.owner.register('service:epics', FakeEpicsService);
      context.owner.register(
        'service:current-project',
        FakeCurrentProjectService
      );

      const onClose = vi.fn();
      await render(
        <template><AddUserStoryModal @onClose={{onClose}} /></template>
      );

      const text = document.body.textContent ?? '';
      expect(text).toContain('Nouvelle User Story');
      expect(text).toContain('Titre');
      expect(text).toContain('Description');
      expect(text).toContain('Épique (optionnel)');
      expect(text).toContain('Points');
      expect(text).toContain('Annuler');
      expect(text).toContain('Créer la User Story');
    }
  );

  renderingTest(
    'Shows epic list including "Aucune épique" and loaded epic',
    async function ({ context }) {
      initializeTestApp(context.owner);
      context.owner.register('service:user-stories', FakeUserStoriesService);
      context.owner.register('service:epics', FakeEpicsService);
      context.owner.register(
        'service:current-project',
        FakeCurrentProjectService
      );

      const onClose = vi.fn();
      await render(
        <template><AddUserStoryModal @onClose={{onClose}} /></template>
      );

      const options = Array.from(
        document.querySelectorAll('#us-epic option')
      ).map((o) => o.textContent?.trim());
      expect(options[0]).toBe('Aucune épique');
      expect(options).toContain('Epic One');
    }
  );
});
