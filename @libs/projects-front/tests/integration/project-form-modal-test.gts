import { describe, expect as hardExpect, vi, beforeEach, afterEach } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render, click, waitFor, triggerEvent, fillIn } from '@ember/test-helpers';
import Service from '@ember/service';
import ProjectFormModal from '#src/components/project-form-modal.gts';
import type { Project } from '#src/schemas/projects.ts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

class FakeProjectsService extends Service {
  create = vi.fn().mockResolvedValue({
    id: 'new-proj',
    name: 'Test Project',
    description: '',
    status: 'planned',
    responsibleId: 'user-1',
    createdById: 'user-1',
    avatar: null,
    githubUrl: null,
    createdAt: '',
    updatedAt: '',
  });
  update = vi.fn().mockResolvedValue({
    id: 'proj-1',
    name: 'Existing Project',
    description: 'Existing description',
    status: 'active',
    responsibleId: 'user-1',
    createdById: 'user-1',
    avatar: null,
    githubUrl: null,
    createdAt: '',
    updatedAt: '',
  });
  loadMembers = vi.fn().mockResolvedValue([]);
  addMember = vi.fn().mockResolvedValue(undefined);
  removeMember = vi.fn().mockResolvedValue(undefined);
}

class FakeCurrentUserService extends Service {
  currentUser = { id: 'user-current' };
}

class FakeSessionService extends Service {
  data = { authenticated: { data: { accessToken: 'fake-token' } } };
}

class FakeStore extends Service {}

function fakeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    name: 'Existing Project',
    description: 'Existing description',
    status: 'active',
    avatar: null,
    githubUrl: null,
    responsibleId: 'user-1',
    createdById: 'user-1',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  } as Project;
}

describe('Integration | ProjectFormModal', function () {
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
    'Create mode — renders creation title and submit button (fr-fr)',
    async function ({ context }) {
      initializeTestApp(context.owner, 'fr-fr');
      context.owner.register('service:projects', FakeProjectsService);
      context.owner.register('service:current-user', FakeCurrentUserService);
      context.owner.register('service:session', FakeSessionService);
      context.owner.register('service:store', FakeStore);

      const onClose = vi.fn();
      await render(<template><ProjectFormModal @onClose={{onClose}} /></template>);

      const text = document.body.textContent ?? '';
      expect(text).toContain('Nouveau projet');
      expect(text).toContain('Nom du projet');
      expect(text).toContain('Créer le projet');
      expect(document.querySelector('[data-test-project-form-modal]')).not.toBeNull();
      expect(
        document.querySelector('[data-test-project-form-mode="create"]'),
      ).not.toBeNull();
    },
  );

  renderingTest(
    'Edit mode — pre-fills fields and renders edit labels (fr-fr)',
    async function ({ context }) {
      initializeTestApp(context.owner, 'fr-fr');
      context.owner.register('service:projects', FakeProjectsService);
      context.owner.register('service:current-user', FakeCurrentUserService);
      context.owner.register('service:session', FakeSessionService);
      context.owner.register('service:store', FakeStore);

      const project = fakeProject();
      const onClose = vi.fn();
      await render(
        <template>
          <ProjectFormModal @project={{project}} @onClose={{onClose}} />
        </template>,
      );

      const text = document.body.textContent ?? '';
      expect(text).toContain('Modifier le projet');
      expect(text).toContain('Enregistrer');
      expect(
        document.querySelector('[data-test-project-form-mode="edit"]'),
      ).not.toBeNull();
      expect(
        (document.querySelector('#proj-name') as HTMLInputElement)?.value,
      ).toBe('Existing Project');
    },
  );

  renderingTest(
    'Edit mode — member diff: calls removeMember for unchecked existing member',
    async function ({ context }) {
      initializeTestApp(context.owner, 'fr-fr');

      // Override fetch to return one user (bob), so the checkbox renders
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [
              {
                id: 'user-bob',
                attributes: {
                  firstName: 'Bob',
                  lastName: 'Builder',
                  email: 'bob@example.com',
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ) as typeof fetch;

      const fakeProjects = {
        create: vi.fn(),
        update: vi.fn().mockResolvedValue(fakeProject()),
        loadMembers: vi.fn().mockResolvedValue([{ id: 'user-bob' }]),
        addMember: vi.fn().mockResolvedValue(undefined),
        removeMember: vi.fn().mockResolvedValue(undefined),
      };

      context.owner.register(
        'service:projects',
        class extends Service {
          create = fakeProjects.create;
          update = fakeProjects.update;
          loadMembers = fakeProjects.loadMembers;
          addMember = fakeProjects.addMember;
          removeMember = fakeProjects.removeMember;
        },
      );
      context.owner.register('service:current-user', FakeCurrentUserService);
      context.owner.register('service:session', FakeSessionService);
      context.owner.register('service:store', FakeStore);

      const project = fakeProject();
      const onClose = vi.fn();

      await render(
        <template>
          <ProjectFormModal @project={{project}} @onClose={{onClose}} />
        </template>,
      );

      // Wait for users and members to load — checkbox appears when this.users is set
      await waitFor('input[type="checkbox"]', { timeout: 2000 });

      // Bob is an existing member (checked) — uncheck him
      await click(document.querySelector('input[type="checkbox"]')!);

      // Submit — bob was in originalMemberIds but not selectedMemberIds → removeMember
      const submitBtn = document.querySelector(
        'button[type="submit"]',
      ) as HTMLButtonElement;
      await click(submitBtn);

      expect(fakeProjects.update).toHaveBeenCalledWith(
        'proj-1',
        hardExpect.objectContaining({ name: 'Existing Project' }),
      );
      expect(fakeProjects.removeMember).toHaveBeenCalledWith(
        'proj-1',
        'user-bob',
      );
    },
  );

  // Phase 4 — Responsible locked as member

  renderingTest(
    'Phase 4 — selecting responsible auto-checks and disables their checkbox',
    async function ({ context }) {
      initializeTestApp(context.owner, 'fr-fr');

      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [
              { id: 'user-alice', attributes: { firstName: 'Alice', lastName: 'Martin', email: 'alice@test.com' } },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ) as typeof fetch;

      context.owner.register('service:projects', FakeProjectsService);
      context.owner.register('service:current-user', FakeCurrentUserService);
      context.owner.register('service:session', FakeSessionService);
      context.owner.register('service:store', FakeStore);

      const onClose = vi.fn();
      await render(<template><ProjectFormModal @onClose={{onClose}} /></template>);

      // Select Alice as responsible
      await waitFor('#proj-responsible option[value="user-alice"]');
      await fillIn('#proj-responsible', 'user-alice');
      await triggerEvent('#proj-responsible', 'change');

      // Checkbox should appear, be checked and disabled
      await waitFor('input[type="checkbox"]');
      const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
      expect(checkbox.disabled).toBe(true);
      expect(document.body.textContent).toContain('Resp.');
    },
  );

  renderingTest(
    'Phase 4 — changing responsible unlocks previous and locks new one',
    async function ({ context }) {
      initializeTestApp(context.owner, 'fr-fr');

      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [
              { id: 'user-alice', attributes: { firstName: 'Alice', lastName: 'Martin', email: 'alice@test.com' } },
              { id: 'user-bob', attributes: { firstName: 'Bob', lastName: 'Builder', email: 'bob@test.com' } },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ) as typeof fetch;

      context.owner.register('service:projects', FakeProjectsService);
      context.owner.register('service:current-user', FakeCurrentUserService);
      context.owner.register('service:session', FakeSessionService);
      context.owner.register('service:store', FakeStore);

      const onClose = vi.fn();
      await render(<template><ProjectFormModal @onClose={{onClose}} /></template>);

      await waitFor('#proj-responsible option[value="user-alice"]');

      // Select Alice
      await fillIn('#proj-responsible', 'user-alice');
      await triggerEvent('#proj-responsible', 'change');
      await waitFor('input[type="checkbox"]');

      const getCheckbox = (name: string) => {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        return [...checkboxes].find((cb) =>
          cb.closest('label')?.textContent?.includes(name),
        ) as HTMLInputElement | undefined;
      };

      expect(getCheckbox('Alice')?.disabled).toBe(true);

      // Switch to Bob
      await fillIn('#proj-responsible', 'user-bob');
      await triggerEvent('#proj-responsible', 'change');

      expect(getCheckbox('Alice')?.disabled).toBe(false);
      expect(getCheckbox('Bob')?.disabled).toBe(true);
    },
  );

  renderingTest(
    'Phase 4 — edit mode: responsible checkbox is disabled from the start',
    async function ({ context }) {
      initializeTestApp(context.owner, 'fr-fr');

      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [
              { id: 'user-1', attributes: { firstName: 'Lead', lastName: 'User', email: 'lead@test.com' } },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ) as typeof fetch;

      const fakeProjectsWithMembers = {
        create: vi.fn(),
        update: vi.fn().mockResolvedValue(fakeProject()),
        loadMembers: vi.fn().mockResolvedValue([{ id: 'user-1' }]),
        addMember: vi.fn().mockResolvedValue(undefined),
        removeMember: vi.fn().mockResolvedValue(undefined),
      };
      context.owner.register(
        'service:projects',
        class extends Service {
          create = fakeProjectsWithMembers.create;
          update = fakeProjectsWithMembers.update;
          loadMembers = fakeProjectsWithMembers.loadMembers;
          addMember = fakeProjectsWithMembers.addMember;
          removeMember = fakeProjectsWithMembers.removeMember;
        },
      );
      context.owner.register('service:current-user', FakeCurrentUserService);
      context.owner.register('service:session', FakeSessionService);
      context.owner.register('service:store', FakeStore);

      const project = fakeProject();
      const onClose = vi.fn();

      await render(
        <template>
          <ProjectFormModal @project={{project}} @onClose={{onClose}} />
        </template>,
      );

      await waitFor('input[type="checkbox"]', { timeout: 2000 });
      const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
      expect(checkbox.disabled).toBe(true);
    },
  );
});
