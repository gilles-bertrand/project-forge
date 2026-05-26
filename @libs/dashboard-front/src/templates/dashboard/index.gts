import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import { t } from 'ember-intl';
import type RouterService from '@ember/routing/router-service';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
import type { SprintData } from '@libs/sprints-front/services/sprints';
import type { Task } from '@libs/backlog-front/schemas/tasks';
import DashboardKpiRow from '../../components/dashboard-kpi-row.gts';
import MyTasksGrid from '../../components/my-tasks-grid.gts';
import type { DashboardIndexModel, DashboardProject } from '../../routes/dashboard/index.ts';

interface DashboardIndexSignature {
  Args: { model: DashboardIndexModel };
}

export default class DashboardIndexTemplate extends Component<DashboardIndexSignature> {
  @service declare router: RouterService;
  @service('current-project') declare currentProject: CurrentProjectService;

  get isWithSprint(): boolean {
    return this.args.model.mode === 'with-sprint';
  }

  get isNoSprint(): boolean {
    return this.args.model.mode === 'no-sprint';
  }

  get activeSprint(): SprintData | null {
    return this.args.model.mode === 'with-sprint' ? this.args.model.activeSprint : null;
  }

  get sprintTasks(): Task[] {
    if (this.args.model.mode !== 'with-sprint') return [];
    return this.args.model.tasks.filter((t) => t.sprintId === this.activeSprint?.id);
  }

  get completedCount(): number {
    return this.sprintTasks.filter((t) => t.status === 'done').length;
  }

  get totalCount(): number {
    return this.sprintTasks.length;
  }

  get completedPoints(): number {
    return this.sprintTasks
      .filter((t) => t.status === 'done')
      .reduce((sum, t) => sum + (t.points ?? 0), 0);
  }

  get totalHours(): number {
    return this.args.model.mode === 'with-sprint' ? this.args.model.totalHours : 0;
  }

  get noSprintProject(): DashboardProject | null {
    return this.args.model.mode === 'no-sprint' ? this.args.model.currentProject : null;
  }

  get noSprintTasks(): Task[] {
    return this.args.model.mode === 'no-sprint' ? this.args.model.tasks : [];
  }

  get tasksInProgress(): number {
    return this.noSprintTasks.filter((t) => t.status !== 'done').length;
  }

  get tasksDone(): number {
    return this.noSprintTasks.filter((t) => t.status === 'done').length;
  }

  get projectsList(): DashboardProject[] {
    return this.args.model.mode === 'no-project' ? this.args.model.projects : [];
  }

  @action goToBacklog() {
    void this.router.transitionTo('dashboard.backlog');
  }

  @action goToSprints() {
    void this.router.transitionTo('dashboard.sprints');
  }

  @action goToProjects() {
    void this.router.transitionTo('dashboard.projects');
  }

  @action selectProject(projectId: string | undefined) {
    if (!projectId) return;
    this.currentProject.setCurrent(projectId);
    void this.router.transitionTo('dashboard.index');
  }

  <template>
    <div class="space-y-6">
      <header>
        <h1 class="text-3xl font-bold" data-test-title>{{t "dashboard.title"}}</h1>
        <p class="opacity-60">{{t "dashboard.subtitle"}}</p>
      </header>

      {{!-- MODE: with-sprint --}}
      {{#if this.isWithSprint}}
        <DashboardKpiRow
          @completedTasks={{this.completedCount}}
          @totalTasks={{this.totalCount}}
          @totalHours={{this.totalHours}}
          @completedPoints={{this.completedPoints}}
        />
        <section>
          <h2 class="text-xl font-semibold mb-4">
            {{t "dashboard.sprintTasks" count=this.totalCount}}
          </h2>
          <MyTasksGrid @tasks={{this.sprintTasks}} />
        </section>

      {{!-- MODE: no-sprint --}}
      {{else if this.isNoSprint}}
        <section>
          <h2 class="text-xl font-semibold mb-4" data-test-no-sprint-title>
            {{t "dashboard.noSprint.title" name=this.noSprintProject.name}}
          </h2>
          <p class="opacity-60 mb-4">{{t "dashboard.noSprint.subtitle"}}</p>
          <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="card bg-base-200 shadow p-4">
              <h3 class="text-sm opacity-60">{{t "dashboard.counts.tasksInProgress"}}</h3>
              <p class="text-3xl font-bold mt-1">{{this.tasksInProgress}}</p>
            </div>
            <div class="card bg-base-200 shadow p-4">
              <h3 class="text-sm opacity-60">{{t "dashboard.counts.tasksDone"}}</h3>
              <p class="text-3xl font-bold mt-1">{{this.tasksDone}}</p>
            </div>
          </div>
          <div class="flex gap-3">
            <button
              type="button"
              class="btn btn-primary"
              {{on "click" this.goToSprints}}
              data-test-cta-sprints
            >
              {{t "dashboard.noSprint.cta.startSprint"}}
            </button>
            <button
              type="button"
              class="btn btn-outline"
              {{on "click" this.goToBacklog}}
              data-test-cta-backlog
            >
              {{t "dashboard.noSprint.cta.viewBacklog"}}
            </button>
          </div>
        </section>

      {{!-- MODE: no-project --}}
      {{else}}
        <section data-test-no-project>
          <h2 class="text-xl font-semibold mb-2">{{t "dashboard.noProject.title"}}</h2>
          <p class="opacity-60 mb-4">{{t "dashboard.noProject.subtitle"}}</p>
          {{#if this.projectsList}}
            <ul class="space-y-2 mb-4">
              {{#each this.projectsList as |p|}}
                <li>
                  <button
                    type="button"
                    class="btn btn-ghost w-full text-left justify-start"
                    {{on "click" (fn this.selectProject p.id)}}
                  >
                    {{p.name}}
                  </button>
                </li>
              {{/each}}
            </ul>
          {{/if}}
          <button
            type="button"
            class="btn btn-primary"
            {{on "click" this.goToProjects}}
            data-test-cta-create
          >
            {{t "dashboard.noProject.cta.create"}}
          </button>
        </section>
      {{/if}}
    </div>
  </template>
}
