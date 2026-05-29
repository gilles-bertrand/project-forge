import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { on } from '@ember/modifier';
import { t } from 'ember-intl';
import { concat } from '@ember/helper';
import TaskCard from '@libs/backlog-front/components/task-card';
import SprintBurndownModal from './sprint-burndown-modal.gts';
import type { SprintData } from '../services/sprints.ts';
import type { Task } from '@libs/backlog-front/schemas/tasks';
import { formatSprintCode } from '../utils/format-sprint-code.ts';

interface SprintCardSignature {
  Args: {
    sprint: SprintData;
    tasks: Task[];
    onStart?: (sprintId: string) => void;
    onStop?: (sprintId: string) => void;
    onPlanTask?: (taskId: string, sprintId: string) => void;
    onOpenTask?: (task: Task) => void;
  };
  Element: HTMLDivElement;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default class SprintCard extends Component<SprintCardSignature> {
  @tracked burndownOpen = false;

  get isActive(): boolean {
    return this.args.sprint.status === 'active';
  }

  get isPlanned(): boolean {
    return this.args.sprint.status === 'planned';
  }

  get isCompleted(): boolean {
    return this.args.sprint.status === 'completed';
  }

  get statusBadgeClass(): string {
    if (this.isActive) return 'badge-success';
    if (this.isCompleted) return 'badge-neutral';
    return 'badge-ghost';
  }

  get statusKey(): string {
    return this.args.sprint.status;
  }

  get progressPercent(): number {
    const total = this.args.sprint.velocityPoints;
    if (!total) return 0;
    return Math.round((this.args.sprint.completedPoints / total) * 100);
  }

  get sprintCode(): string {
    return formatSprintCode(this.args.sprint.number ?? 0);
  }

  get isOverVelocity(): boolean {
    const { velocityPoints, completedPoints } = this.args.sprint;
    return velocityPoints > 0 && completedPoints > velocityPoints;
  }

  get tasksCount(): number {
    return this.args.tasks.length;
  }

  get doneTasksCount(): number {
    return this.args.tasks.filter((t) => t.status === 'done').length;
  }

  get showBurndown(): boolean {
    return this.isActive || this.isCompleted;
  }

  @action openBurndown() {
    this.burndownOpen = true;
  }

  @action closeBurndown() {
    this.burndownOpen = false;
  }

  @action onStartClick() {
    this.args.onStart?.(this.args.sprint.id ?? '');
  }

  @action onStopClick() {
    this.args.onStop?.(this.args.sprint.id ?? '');
  }

  @action onDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  }

  @action onDrop(e: DragEvent) {
    e.preventDefault();
    const taskId =
      e.dataTransfer?.getData('application/x-task-id') ??
      e.dataTransfer?.getData('text/plain');
    if (!taskId) return;
    this.args.onPlanTask?.(taskId, this.args.sprint.id ?? '');
  }

  <template>
    <div
      class="flex flex-col gap-3 p-4 rounded-lg bg-base-200 min-h-96"
      data-test-sprint-card={{@sprint.id}}
      {{on "dragover" this.onDragOver}}
      {{on "drop" this.onDrop}}
      ...attributes
    >
      <div class="flex items-start justify-between gap-2">
        <span
          class="badge badge-sm {{this.statusBadgeClass}}"
          data-test-sprint-status
        >
          {{t (concat "sprints.status." this.statusKey)}}
        </span>
        <span class="text-xs font-mono opacity-40" data-test-sprint-code>{{this.sprintCode}}</span>
      </div>

      <div>
        <h3 class="font-bold text-lg truncate">{{@sprint.name}}</h3>
        <div class="text-xs opacity-60 mt-1">
          <span class="font-medium opacity-80">{{t
              "sprints.card.goalLabel"
            }}
            :</span>
          <p class="italic opacity-90 mt-0.5">{{@sprint.goal}}</p>
        </div>
      </div>

      <div class="text-xs opacity-60">
        📅
        {{formatDate @sprint.startDate}}
        -
        {{formatDate @sprint.endDate}}
      </div>

      {{#if this.showBurndown}}
        <button
          type="button"
          class="btn btn-xs btn-ghost self-start gap-1"
          data-test-sprint-burndown
          {{on "click" this.openBurndown}}
        >
          📉
          {{t "sprints.card.burndown"}}
        </button>
      {{/if}}

      {{#if this.isActive}}
        <div class="flex items-center gap-2 text-sm">
          ⚡
          <span class="font-semibold">{{t "sprints.card.velocityLabel"}}</span>:
          {{@sprint.completedPoints}}/{{@sprint.velocityPoints}} pts
          {{#if this.isOverVelocity}}
            <span class="badge badge-warning badge-sm">🔥 dépassement</span>
          {{/if}}
        </div>
        <div>
          <div class="flex justify-between text-xs opacity-60 mb-1">
            <span>Progression</span>
            <span>{{t
                "sprints.card.progress"
                done=this.doneTasksCount
                total=this.tasksCount
                percent=this.progressPercent
              }}</span>
          </div>
          <progress
            class="progress progress-primary w-full"
            value={{this.progressPercent}}
            max="100"
          ></progress>
        </div>
        <button
          type="button"
          class="btn btn-sm btn-error"
          data-test-sprint-stop
          {{on "click" this.onStopClick}}
        >
          ⏹
          {{t "sprints.actions.stopSprint"}}
        </button>
      {{else if this.isPlanned}}
        <button
          type="button"
          class="btn btn-sm btn-primary"
          data-test-sprint-start
          {{on "click" this.onStartClick}}
        >
          ▶
          {{t "sprints.actions.startSprint"}}
        </button>
      {{/if}}

      <div class="mt-2">
        <h4 class="font-semibold text-sm mb-2">{{t
            "sprints.card.tasksLabel"
            count=this.tasksCount
          }}</h4>
        <div class="flex flex-col gap-2 max-h-64 overflow-y-auto">
          {{#each @tasks as |task|}}
            <TaskCard
              @task={{task}}
              @variant="kanban"
              @onOpen={{@onOpenTask}}
            />
          {{else}}
            <p
              class="text-xs italic opacity-50 text-center py-4"
            >{{t "sprints.card.tasksEmpty"}}</p>
          {{/each}}
        </div>
      </div>
    </div>

    {{#if this.burndownOpen}}
      <SprintBurndownModal
        @sprintId={{@sprint.id}}
        @sprintName={{@sprint.name}}
        @onClose={{this.closeBurndown}}
      />
    {{/if}}
  </template>
}
