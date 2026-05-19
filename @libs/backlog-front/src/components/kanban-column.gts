import Component from '@glimmer/component';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { t } from 'ember-intl';
import { concat } from '@ember/helper';
import TaskCard from './task-card.gts';
import type { Task, TaskStatus } from '../schemas/tasks.ts';

interface KanbanColumnSignature {
  Args: {
    status: TaskStatus;
    tasks: Task[];
    onMoveTask: (taskId: string, newStatus: TaskStatus) => void;
    onOpenTask?: (task: Task) => void;
  };
  Element: HTMLDivElement;
}

export default class KanbanColumn extends Component<KanbanColumnSignature> {
  @action onDragOver(e: DragEvent): void {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  }

  @action onDrop(e: DragEvent): void {
    e.preventDefault();
    const taskId =
      e.dataTransfer?.getData('application/x-task-id') ??
      e.dataTransfer?.getData('text/plain');
    if (!taskId) return;
    this.args.onMoveTask(taskId, this.args.status);
  }

  <template>
    {{! template-lint-disable require-presentational-children }}
    <div
      class="flex flex-col gap-2 min-w-64 flex-1 bg-base-200 rounded-lg p-3"
      data-test-kanban-column={{@status}}
      {{on "dragover" this.onDragOver}}
      {{on "drop" this.onDrop}}
      ...attributes
    >
      <div class="flex items-baseline justify-between mb-2 px-1">
        <h3 class="font-semibold text-sm uppercase tracking-wider">
          {{t (concat "backlog.kanban.columns." @status)}}
        </h3>
        <span class="text-xs opacity-50">
          {{t "backlog.kanban.cardCount" count=@tasks.length}}
        </span>
      </div>
      <div class="flex flex-col gap-2 min-h-32">
        {{#each @tasks as |task|}}
          <TaskCard
            @task={{task}}
            @variant="kanban"
            @draggable={{true}}
            @onOpen={{@onOpenTask}}
          />
        {{else}}
          <p class="text-xs opacity-40 italic text-center py-4">
            {{t "backlog.kanban.dragHint"}}
          </p>
        {{/each}}
      </div>
    </div>
  </template>
}
