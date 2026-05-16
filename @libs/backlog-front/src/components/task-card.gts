import Component from '@glimmer/component';
import { on } from '@ember/modifier';
import { action } from '@ember/object';
import { t } from 'ember-intl';
import TaskNatureBadge from './task-nature-badge.gts';
import TaskTypeBadge from './task-type-badge.gts';
import TaskStatusBadge from './task-status-badge.gts';
import type { Task } from '../schemas/tasks.ts';
import type { UserStory } from '../schemas/user-stories.ts';

interface TaskCardSignature {
  Args: {
    task: Task;
    userStory?: UserStory | null;
    variant?: 'kanban' | 'dashboard';
    onOpen?: (task: Task) => void;
  };
  Element: HTMLDivElement;
}

export default class TaskCard extends Component<TaskCardSignature> {
  get isKanban(): boolean {
    return (this.args.variant ?? 'kanban') === 'kanban';
  }

  get numberLabel(): string {
    return `#${this.args.task.number}`;
  }

  get initials(): string {
    return this.args.task.createdById
      .replace('user-', 'U')
      .toUpperCase()
      .slice(0, 2);
  }

  @action handleClick(): void {
    if (this.args.onOpen) {
      this.args.onOpen(this.args.task);
    }
  }

  <template>
    {{#if this.isKanban}}
      {{! template-lint-disable require-presentational-children }}
      <div
        class="card bg-base-200 hover:bg-base-300 cursor-pointer transition-colors p-3"
        data-test-task-card
        role="button"
        tabindex="0"
        aria-label="Task {{this.numberLabel}} {{@task.title}}"
        {{on "click" this.handleClick}}
        ...attributes
      >
        <div class="flex items-start justify-between gap-2">
          <span class="text-xs font-mono opacity-50">{{this.numberLabel}}</span>
          <span class="badge badge-sm badge-primary badge-soft text-xs">
            ⚡
            {{@task.points}}
            pts
          </span>
        </div>

        <div class="mt-2 truncate font-medium">{{@task.title}}</div>

        <div class="mt-1 text-xs opacity-70 line-clamp-2">
          {{@task.description}}
        </div>

        <div class="mt-2 flex flex-wrap gap-1">
          <TaskNatureBadge @nature={{@task.nature}} />
          <TaskTypeBadge @type={{@task.type}} />
        </div>

        {{#if @userStory}}
          <div class="mt-2 text-xs opacity-50 truncate">
            {{t "backlog.taskRow.linkedToUS" title=@userStory.title}}
          </div>
        {{/if}}

        <div class="mt-3 flex items-center justify-between">
          <div class="flex items-center -space-x-1">
            <div
              class="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-content"
            >
              {{this.initials}}
            </div>
          </div>
        </div>
      </div>
    {{else}}
      {{! template-lint-disable require-presentational-children }}
      <div
        class="flex items-center gap-3 px-4 py-2 rounded-lg bg-base-200 hover:bg-base-300 cursor-pointer"
        data-test-task-card
        role="button"
        tabindex="0"
        aria-label="Task {{this.numberLabel}} {{@task.title}}"
        {{on "click" this.handleClick}}
        ...attributes
      >
        <span
          class="text-xs font-mono opacity-50 w-12 flex-shrink-0"
        >{{this.numberLabel}}</span>
        <div class="flex-shrink-0">
          <TaskStatusBadge @status={{@task.status}} />
        </div>
        <span class="truncate flex-1 font-medium">{{@task.title}}</span>
        <div class="flex-shrink-0">
          <TaskNatureBadge @nature={{@task.nature}} />
        </div>
        <span class="text-xs opacity-70 flex-shrink-0">
          {{t "backlog.taskRow.points" count=@task.points}}
        </span>
      </div>
    {{/if}}
  </template>
}
