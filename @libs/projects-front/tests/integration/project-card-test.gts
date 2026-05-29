import { describe, expect as hardExpect, vi } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render } from '@ember/test-helpers';
import Service from '@ember/service';
import ProjectCard from '#src/components/project-card.gts';
import type { Project } from '#src/schemas/projects.ts';
import type { MemberLite } from '#src/components/member-avatar-stack.gts';
import type { ProjectStats } from '#src/services/projects.ts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

const FAKE_STATS: ProjectStats = {
  projectId: 'proj-test',
  epics: { total: 4, done: 2 },
  userStories: { total: 10, done: 3 },
  tasks: { total: 20, done: 5 },
  sprints: { total: 2, active: 1 },
  currentSprint: { id: 's1', tasksDone: 4, tasksTotal: 8 },
};

class FakeProjectsService extends Service {
  loadMembers = vi.fn().mockResolvedValue([] as MemberLite[]);
  loadStats = vi.fn().mockResolvedValue(FAKE_STATS);
}

function fakeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-test',
    name: 'Test Project',
    description: 'A description for the test project',
    status: 'active',
    avatar: null,
    githubUrl: null,
    responsibleId: 'user-1',
    createdById: 'user-1',
    createdAt: '2025-03-01T10:00:00Z',
    updatedAt: '2025-03-01T10:00:00Z',
    ...overrides,
  } as Project;
}

describe('Integration | ProjectCard', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest(
    'Renders project name, description and i18n labels',
    async function ({ context }) {
      initializeTestApp(context.owner, 'fr-fr');
      context.owner.register('service:projects', FakeProjectsService);

      const project = fakeProject();
      const onOpen = vi.fn();

      await render(
        <template><ProjectCard @project={{project}} @onActivate={{onOpen}} /></template>,
      );

      expect(document.body.textContent).toContain('Test Project');
      expect(document.body.textContent).toContain(
        'A description for the test project',
      );
      expect(document.body.textContent).toContain('User Stories');
      expect(document.body.textContent).toContain('Sprint en cours');
      // StatusBadge "active" -> "Actif" (concat "projects.status." + @status)
      expect(document.body.textContent).toContain('Actif');
    },
  );

  renderingTest(
    'Uses passed-in members and skips network fetch',
    async function ({ context }) {
      initializeTestApp(context.owner, 'fr-fr');
      const fakeService = new FakeProjectsService();
      context.owner.register(
        'service:projects',
        class extends FakeProjectsService {
          loadMembers = fakeService.loadMembers;
        },
      );

      const project = fakeProject();
      const members: MemberLite[] = [
        { id: '1', firstName: 'Alice', lastName: 'Wonder' },
        { id: '2', firstName: 'Bob', lastName: 'Builder' },
      ];
      const onOpen = vi.fn();

      await render(
        <template>
          <ProjectCard
            @project={{project}}
            @members={{members}}
            @onActivate={{onOpen}}
          />
        </template>,
      );

      expect(fakeService.loadMembers).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain('AW');
      expect(document.body.textContent).toContain('BB');
    },
  );

  renderingTest(
    'Displays real stats counters after loadStats resolves',
    async function ({ context }) {
      initializeTestApp(context.owner, 'fr-fr');
      context.owner.register('service:projects', FakeProjectsService);

      const project = fakeProject();
      const noop = vi.fn();
      await render(
        <template><ProjectCard @project={{project}} @onActivate={{noop}} /></template>,
      );

      const text = document.body.textContent ?? '';
      expect(text).toContain('2/4');   // epics done/total
      expect(text).toContain('3/10');  // userStories done/total
      expect(text).toContain('5/20');  // tasks done/total
      expect(text).toContain('1/2');   // sprints active/total
    },
  );

  renderingTest(
    'Displays fetched member avatars with correct initials',
    async function ({ context }) {
      initializeTestApp(context.owner, 'fr-fr');
      const members: MemberLite[] = [
        { id: 'u1', firstName: 'Alice', lastName: 'Smith' },
        { id: 'u2', firstName: 'Bob', lastName: 'Jones' },
      ];
      class ServiceWithMembers extends FakeProjectsService {
        override loadMembers = vi.fn().mockResolvedValue(members);
      }
      context.owner.register('service:projects', ServiceWithMembers);

      const project = fakeProject();
      const noop = vi.fn();
      await render(
        <template><ProjectCard @project={{project}} @onActivate={{noop}} /></template>,
      );

      const text = document.body.textContent ?? '';
      expect(text).toContain('AS');
      expect(text).toContain('BJ');
    },
  );

  renderingTest(
    'Shows empty state when no members are available',
    async function ({ context }) {
      initializeTestApp(context.owner, 'fr-fr');
      context.owner.register('service:projects', FakeProjectsService);

      const project = fakeProject();
      const noop = vi.fn();
      await render(
        <template><ProjectCard @project={{project}} @onActivate={{noop}} /></template>,
      );

      expect(document.querySelector('[data-test-project-card-no-members]')).toBeTruthy();
      expect(document.body.textContent).toContain('Aucun membre');
    },
  );

  renderingTest(
    'Mini-counters have visible border (dark mode fix)',
    async function ({ context }) {
      initializeTestApp(context.owner, 'fr-fr');
      context.owner.register('service:projects', FakeProjectsService);

      const project = fakeProject();
      const noop = vi.fn();
      await render(
        <template><ProjectCard @project={{project}} @onActivate={{noop}} /></template>,
      );

      const counters = document.querySelectorAll('[data-test-project-card] .bg-base-100.border');
      expect(counters.length).toBeGreaterThanOrEqual(4);
    },
  );
});
