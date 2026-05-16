import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { t } from 'ember-intl';
import KanbanBoard from '../../components/kanban-board.gts';
import KanbanFilters from '../../components/kanban-filters.gts';
import SprintHeader from '../../components/sprint-header.gts';
import TaskDetailModal from '../../components/task-detail-modal.gts';
import type { KanbanFilterValue } from '../../components/kanban-filters.gts';
import type TasksService from '../../services/tasks.ts';
import type CurrentUserService from '@libs/users-front/services/current-user';
import type { Task, TaskStatus } from '../../schemas/tasks.ts';
import type { Sprint } from '../../schemas/sprints.ts';

interface KanbanTemplateSignature {
  Args: {
    model: { projectId: string | null; sprint: Sprint | null };
  };
}

const STORAGE_KEY = 'sprintforge:kanban-filter';

function loadFilter(): KanbanFilterValue {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'mine' || v === 'all') return v;
  } catch {
    // localStorage unavailable
  }
  return 'all';
}

function saveFilter(v: KanbanFilterValue): void {
  try {
    localStorage.setItem(STORAGE_KEY, v);
  } catch {
    // localStorage unavailable
  }
}

export default class DashboardKanbanTemplate extends Component<KanbanTemplateSignature> {
  @service declare tasks: TasksService;
  @service declare currentUser: CurrentUserService;

  @tracked filter: KanbanFilterValue = loadFilter();
  @tracked detailTask: Task | null = null;
  @tracked errorMessage: string | null = null;

  get sprintTasks(): Task[] {
    const sprint = this.args.model.sprint;
    if (!sprint) return [];
    return this.tasks.all.filter((t) => t.sprintId === sprint.id);
  }

  get filteredTasks(): Task[] {
    const tasks = this.sprintTasks;
    if (this.filter === 'all') return tasks;
    const userId = this.currentUser.user?.id;
    if (!userId) return tasks;
    return tasks.filter((t) => t.createdById === userId);
  }

  get pointsCompleted(): number {
    return this.sprintTasks
      .filter((t) => t.status === 'done')
      .reduce((sum, t) => sum + t.points, 0);
  }

  get pointsTotal(): number {
    return this.sprintTasks.reduce((sum, t) => sum + t.points, 0);
  }

  @action onFilterChange(value: KanbanFilterValue) {
    this.filter = value;
    saveFilter(value);
  }

  @action openDetail(task: Task) {
    this.detailTask = task;
  }

  @action closeDetail() {
    this.detailTask = null;
  }

  @action async onMoveTask(taskId: string, newStatus: TaskStatus) {
    const task = this.tasks.all.find((t) => t.id === taskId);
    if (!task) return;
    const previousStatus = task.status;
    if (previousStatus === newStatus) return;

    // Optimistic update
    task.status = newStatus;

    try {
      await this.tasks.update(
        taskId,
        { status: newStatus },
        { refresh: false }
      );
    } catch (err: unknown) {
      // Rollback
      task.status = previousStatus;
      this.errorMessage =
        err instanceof Error ? err.message : 'Move failed — reverted.';
      setTimeout(() => {
        this.errorMessage = null;
      }, 4000);
    }
  }

  <template>
    <div>
      <div class="flex items-start justify-between mb-4">
        <div>
          <h1 class="text-3xl font-bold">{{t "backlog.kanban.title"}}</h1>
          <p class="opacity-70 mt-1">{{t "backlog.kanban.subtitle"}}</p>
        </div>
        <KanbanFilters
          @value={{this.filter}}
          @onChange={{this.onFilterChange}}
        />
      </div>

      {{#if @model.projectId}}
        {{#if @model.sprint}}
          <SprintHeader
            @sprint={{@model.sprint}}
            @pointsCompleted={{this.pointsCompleted}}
            @pointsTotal={{this.pointsTotal}}
          />
        {{else}}
          <div class="alert alert-info mb-4">
            <span>{{t "backlog.kanban.noActiveSprint"}}</span>
          </div>
        {{/if}}

        <KanbanBoard
          @tasks={{this.filteredTasks}}
          @onMoveTask={{this.onMoveTask}}
          @onOpenTask={{this.openDetail}}
        />

        {{#if this.errorMessage}}
          <div
            class="alert alert-error mt-4 text-sm"
            role="alert"
          >{{this.errorMessage}}</div>
        {{/if}}
      {{else}}
        <div class="alert alert-info">
          <span>{{t "backlog.noProjectSelected"}}</span>
        </div>
      {{/if}}
    </div>

    {{#if this.detailTask}}
      <TaskDetailModal
        @task={{this.detailTask}}
        @onClose={{this.closeDetail}}
      />
    {{/if}}
  </template>
}
