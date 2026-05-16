import Component from '@glimmer/component';
import { t } from 'ember-intl';
import type { SprintData } from '@libs/sprints-front/services/sprints';
import type { Task } from '@libs/backlog-front/schemas/tasks';
import DashboardKpiRow from '../../components/dashboard-kpi-row.gts';
import MyTasksGrid from '../../components/my-tasks-grid.gts';

interface DashboardIndexSignature {
  Args: { model: { activeSprint: SprintData | null; tasks: Task[]; totalHours: number } };
}

export default class DashboardIndexTemplate extends Component<DashboardIndexSignature> {
  get sprintTasks() {
    if (!this.args.model.activeSprint) return [];
    return this.args.model.tasks.filter(t => t.sprintId === this.args.model.activeSprint!.id);
  }

  get completedCount() {
    return this.sprintTasks.filter(t => t.status === 'done').length;
  }

  get totalCount() {
    return this.sprintTasks.length;
  }

  get completedPoints() {
    return this.sprintTasks.filter(t => t.status === 'done').reduce((sum, t) => sum + (t.points ?? 0), 0);
  }

  <template>
    <div class="space-y-6">
      <header>
        <h1 class="text-3xl font-bold" data-test-title>{{t "dashboard.title"}}</h1>
        <p class="opacity-60">{{t "dashboard.subtitle"}}</p>
      </header>
      {{#if @model.activeSprint}}
        <DashboardKpiRow
          @completedTasks={{this.completedCount}}
          @totalTasks={{this.totalCount}}
          @totalHours={{@model.totalHours}}
          @completedPoints={{this.completedPoints}}
        />
        <section>
          <h2 class="text-xl font-semibold mb-4">{{t "dashboard.sprintTasks" count=this.totalCount}}</h2>
          <MyTasksGrid @tasks={{this.sprintTasks}} />
        </section>
      {{else}}
        <div class="alert alert-info" data-test-no-sprint>{{t "dashboard.noActiveSprint"}}</div>
      {{/if}}
    </div>
  </template>
}
