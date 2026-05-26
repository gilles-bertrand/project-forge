import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import { t } from 'ember-intl';
import type { TOC } from '@ember/component/template-only';
import type RouterService from '@ember/routing/router-service';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
import type { Project } from '../schemas/projects.ts';

const ListIcon: TOC<{ Element: SVGSVGElement }> = <template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    class="size-5 stroke-current"
    aria-hidden="true"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M4 6h16M4 10h16M4 14h16M4 18h16"
    />
  </svg>
</template>;

const KanbanIcon: TOC<{ Element: SVGSVGElement }> = <template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    class="size-5 stroke-current"
    aria-hidden="true"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
    />
  </svg>
</template>;

const UserStoryMapIcon: TOC<{ Element: SVGSVGElement }> = <template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    class="size-5 stroke-current"
    aria-hidden="true"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M6 3v12m0 0a3 3 0 100 6 3 3 0 000-6zm0 0c3.314 0 6-2.686 6-6m6-6a3 3 0 100 6 3 3 0 000-6zm0 6v6"
    />
  </svg>
</template>;

const TargetIcon: TOC<{ Element: SVGSVGElement }> = <template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    class="size-5 stroke-current"
    aria-hidden="true"
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
    />
    <circle
      cx="12"
      cy="12"
      r="6"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
    />
    <circle
      cx="12"
      cy="12"
      r="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
    />
  </svg>
</template>;

type NavRoute =
  | 'dashboard.backlog'
  | 'dashboard.kanban'
  | 'dashboard.user-story-map'
  | 'dashboard.sprints';

interface ProjectActionBarSignature {
  Args: {
    project: Project;
    onNavigate?: () => void;
  };
  Element: HTMLDivElement;
}

// TODO(a11y): ProjectActionBar lives inside a role=button card (project-card.gts) —
// nested interactive content. Resolve by changing ProjectCard's role to "article"
// or "listitem" and moving the click handler to an explicit "Open" button.
export default class ProjectActionBar extends Component<ProjectActionBarSignature> {
  @service declare router: RouterService;
  @service('current-project') declare currentProject: CurrentProjectService;

  @action
  goTo(route: NavRoute, e: Event): void {
    e.stopPropagation();
    if (this.args.project.id) {
      this.currentProject.setCurrent(this.args.project.id);
    }
    void this.router.transitionTo(route);
    this.args.onNavigate?.();
  }

  <template>
    <div class="flex items-center gap-2" ...attributes>
      <button
        type="button"
        class="btn btn-sm btn-ghost"
        aria-label={{t "projects.action.backlogAria"}}
        title={{t "projects.action.backlogAria"}}
        data-test-project-action-backlog
        {{on "click" (fn this.goTo "dashboard.backlog")}}
      >
        <ListIcon />
      </button>
      <button
        type="button"
        class="btn btn-sm btn-ghost"
        aria-label={{t "projects.action.kanbanAria"}}
        title={{t "projects.action.kanbanAria"}}
        data-test-project-action-kanban
        {{on "click" (fn this.goTo "dashboard.kanban")}}
      >
        <KanbanIcon />
      </button>
      <button
        type="button"
        class="btn btn-sm btn-ghost"
        aria-label={{t "projects.action.userStoryMapAria"}}
        title={{t "projects.action.userStoryMapAria"}}
        data-test-project-action-user-story-map
        {{on "click" (fn this.goTo "dashboard.user-story-map")}}
      >
        <UserStoryMapIcon />
      </button>
      <button
        type="button"
        class="btn btn-sm btn-ghost"
        aria-label={{t "projects.action.sprintsAria"}}
        title={{t "projects.action.sprintsAria"}}
        data-test-project-action-sprints
        {{on "click" (fn this.goTo "dashboard.sprints")}}
      >
        <TargetIcon />
      </button>
    </div>
  </template>
}
