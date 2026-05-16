import Component from '@glimmer/component';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { t } from 'ember-intl';
import { concat } from '@ember/helper';
import TaskCard from '@libs/backlog-front/components/task-card';
import type { SprintData } from '../services/sprints.ts';
import type { Task } from '@libs/backlog-front/schemas/tasks';

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

  get tasksCount(): number {
    return this.args.tasks.length;
  }

  get doneTasksCount(): number {
    return this.args.tasks.filter((t) => t.status === 'done').length;
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

      {{#if this.isActive}}
        <div class="text-sm">
          ⚡
          <span class="font-semibold">{{t "sprints.card.velocityLabel"}}</span>:
          {{@sprint.velocityPoints}}
          points
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
  </template>
}
