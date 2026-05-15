import { describe, expect as hardExpect, vi } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render } from '@ember/test-helpers';
import Service from '@ember/service';
import ProjectDetailModal from '#src/components/project-detail-modal.gts';
import type { Project } from '#src/schemas/projects.ts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

class FakeCurrentProjectService extends Service {
  setCurrent = vi.fn();
}

function fakeProject(): Project {
  return {
    id: 'proj-test',
    name: 'Detail Test Project',
    description: 'Detail description text',
    status: 'active',
    avatar: null,
    githubUrl: null,
    responsibleId: 'user-1',
    createdById: 'user-1',
    createdAt: '2025-03-01T10:00:00Z',
    updatedAt: '2025-03-01T10:00:00Z',
  } as Project;
}

describe('Integration | ProjectDetailModal', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest(
    'Renders header, description, sections and footer buttons (fr-fr)',
    async function ({ context }) {
      initializeTestApp(context.owner, 'fr-fr');
      context.owner.register(
        'service:current-project',
        FakeCurrentProjectService,
      );

      const project = fakeProject();
      const onClose = vi.fn();
      await render(
        <template>
          <ProjectDetailModal @project={{project}} @onClose={{onClose}} />
        </template>,
      );

      const text = document.body.textContent ?? '';
      expect(text).toContain('Detail Test Project');
      expect(text).toContain('Detail description text');
      expect(text).toContain('Description');
      expect(text).toContain('Progression du projet');
      expect(text).toContain('Statistiques');
      expect(text).toContain('Équipe');
      expect(text).toContain('Fermer');
      expect(text).toContain('Voir le Kanban');
    },
  );

  renderingTest(
    'Renders 4 stats labels translated via i18n',
    async function ({ context }) {
      initializeTestApp(context.owner, 'fr-fr');
      context.owner.register(
        'service:current-project',
        FakeCurrentProjectService,
      );

      const project = fakeProject();
      const onClose = vi.fn();
      await render(
        <template>
          <ProjectDetailModal @project={{project}} @onClose={{onClose}} />
        </template>,
      );

      const text = document.body.textContent ?? '';
      expect(text).toContain('Épiques');
      expect(text).toContain('User Stories');
      expect(text).toContain('Tâches');
      expect(text).toContain('Sprints');
    },
  );
});
