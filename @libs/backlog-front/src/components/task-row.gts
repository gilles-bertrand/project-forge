import Component from '@glimmer/component';
import { on } from '@ember/modifier';
import { action } from '@ember/object';
import { t } from 'ember-intl';
import TaskNatureBadge from './task-nature-badge.gts';
import TaskTypeBadge from './task-type-badge.gts';
import type { Task } from '../schemas/tasks.ts';
import type { UserStory } from '../schemas/user-stories.ts';

interface TaskRowSignature {
  Args: {
    task: Task;
    userStory?: UserStory | null;
    onOpen?: (task: Task) => void;
    draggable?: boolean;
  };
  Element: HTMLDivElement;
}

function initialsFor(createdById: string): string {
  return createdById.replace('user-', 'U').toUpperCase().slice(0, 2);
}

export default class TaskRow extends Component<TaskRowSignature> {
  get numberLabel(): string {
    return `#${this.args.task.number}`;
  }

  get initials(): string {
    return initialsFor(this.args.task.createdById);
  }

  get isClickable(): boolean {
    return typeof this.args.onOpen === 'function';
  }

  @action handleClick() {
    this.args.onOpen?.(this.args.task);
  }

  @action onDragStart(e: DragEvent): void {
    if (!this.args.draggable || !this.args.task.id) return;
    e.dataTransfer?.setData('text/plain', this.args.task.id);
    e.dataTransfer?.setData('application/x-task-id', this.args.task.id);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }

  <template>
    <div
      class="flex items-center justify-between gap-4 rounded-lg bg-base-200 px-4 py-3
        {{if
          this.isClickable
          'cursor-pointer hover:bg-base-300 transition-colors'
        }}"
      role={{if this.isClickable "button"}}
      tabindex={{if this.isClickable "0"}}
      draggable={{if @draggable "true"}}
      data-test-task-row
      {{on "click" this.handleClick}}
      {{on "dragstart" this.onDragStart}}
      ...attributes
    >
      <div class="min-w-0 flex-1">
        <div class="flex items-baseline gap-2">
          <span class="text-xs font-mono opacity-50">{{this.numberLabel}}</span>
          <span class="truncate font-medium">{{@task.title}}</span>
        </div>
        <div class="mt-1 flex flex-wrap items-center gap-1">
          <TaskNatureBadge @nature={{@task.nature}} />
          <TaskTypeBadge @type={{@task.type}} />
          {{#if @userStory}}
            <span class="text-xs opacity-50">
              {{t "backlog.taskRow.linkedToUS" title=@userStory.title}}
            </span>
          {{/if}}
        </div>
      </div>

      <div class="flex flex-shrink-0 items-center gap-3">
        <div
          class="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-content"
        >
          {{this.initials}}
        </div>
        <span class="text-xs opacity-70">
          {{t "backlog.taskRow.points" count=@task.points}}
        </span>
      </div>
    </div>
  </template>
}
