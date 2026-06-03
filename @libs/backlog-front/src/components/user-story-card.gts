import Component from '@glimmer/component';
import { action } from '@ember/object';
import { concat, fn } from '@ember/helper';
import { on } from '@ember/modifier';
import { t } from 'ember-intl';
import type {
  StoryPriority,
  StoryStatus,
  UserStory,
} from '../schemas/user-stories.ts';
import type { Epic } from '../schemas/epics.ts';
import type { Task } from '../schemas/tasks.ts';
import TaskStatusBadge from './task-status-badge.gts';

// Recopied from user-story-row.gts on purpose: card and row are intentionally
// decoupled so a layout change to one never silently breaks the other.
const PRIORITY_BADGE_CLASS: Record<StoryPriority, string> = {
  Basse: 'badge-ghost',
  Moyenne: 'badge-info',
  Haute: 'badge-warning',
  Critique: 'badge-error',
};

const STATUS_DOT_CLASS: Record<StoryStatus, string> = {
  suggested: 'bg-base-300',
  accepted: 'bg-info/70',
  estimated: 'bg-info',
  planned: 'bg-primary/70',
  'in-progress': 'bg-primary',
  done: 'bg-success',
};

const NO_EPIC_COLOR = '#6B7280';

interface UserStoryCardSignature {
  Element: HTMLDivElement;
  Args: {
    userStory: UserStory;
    epic?: Epic | null;
    tasks: Task[];
    expanded: boolean;
    onOpen?: (us: UserStory) => void;
    onToggle?: (us: UserStory) => void;
    onOpenTask?: (task: Task) => void;
  };
}

/**
 * Card representation of a User Story for the Backlog. Carries the parent
 * epic's colour as a left accent, surfaces status/priority/points and the
 * attached-task count, and expands in place (chevron) to reveal its tasks.
 */
export default class UserStoryCard extends Component<UserStoryCardSignature> {
  get taskCount(): number {
    return this.args.tasks.length;
  }

  get epicColor(): string {
    return this.args.epic?.color ?? NO_EPIC_COLOR;
  }

  // Inline style: the colour is dynamic per epic and can't be a Tailwind
  // utility. Hex strings are validated by the backend Zod schema on persist.
  get borderStyle(): string {
    return `border-left: 4px solid ${this.epicColor}`;
  }

  get dotStyle(): string {
    return `background-color: ${this.epicColor}`;
  }

  get priorityBadgeClass(): string {
    const priority = this.args.userStory.priority ?? 'Moyenne';
    return PRIORITY_BADGE_CLASS[priority] ?? 'badge-ghost';
  }

  get statusDotClass(): string {
    return STATUS_DOT_CLASS[this.args.userStory.status] ?? 'bg-base-300';
  }

  @action open() {
    this.args.onOpen?.(this.args.userStory);
  }

  @action toggle() {
    this.args.onToggle?.(this.args.userStory);
  }

  @action openTask(task: Task) {
    this.args.onOpenTask?.(task);
  }

  <template>
    <div
      class="card bg-base-100 border border-base-300 shadow-md hover:shadow-lg hover:border-primary/40 transition-all"
      style={{this.borderStyle}}
      data-test-user-story-card={{@userStory.id}}
      data-test-us-card-epic-color={{this.epicColor}}
      ...attributes
    >
      <div class="card-body gap-3 p-4">
        <div class="flex items-center gap-2 min-w-0">
          <button
            type="button"
            class="btn btn-ghost btn-xs btn-circle flex-shrink-0"
            aria-expanded={{@expanded}}
            aria-label={{t "backlog.card.toggleTasksAria"}}
            data-test-us-card-toggle
            {{on "click" this.toggle}}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="size-3 opacity-60 transition-transform
                {{if @expanded 'rotate-90'}}"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
          <span
            class="size-2.5 rounded-full flex-shrink-0 {{this.statusDotClass}}"
            data-test-us-card-status={{@userStory.status}}
            aria-label={{t (concat "backlog.status." @userStory.status)}}
            title={{t (concat "backlog.status." @userStory.status)}}
          ></span>
          <button
            type="button"
            class="flex-1 min-w-0 truncate text-left text-sm font-semibold hover:text-primary"
            data-test-us-card-title
            {{on "click" this.open}}
          >{{@userStory.title}}</button>
          <span
            class="badge badge-sm py-2.5
              {{this.priorityBadgeClass}}
              font-medium flex-shrink-0"
            data-test-us-card-priority={{@userStory.priority}}
          >{{t (concat "backlog.priority." @userStory.priority)}}</span>
        </div>

        <div class="flex items-center gap-2 text-xs min-w-0">
          <span
            class="inline-flex items-center gap-1.5 min-w-0 opacity-80"
            data-test-us-card-epic
          >
            <span
              class="size-2.5 rounded-full flex-shrink-0"
              style={{this.dotStyle}}
              aria-hidden="true"
            ></span>
            <span class="truncate">
              {{#if @epic}}
                {{@epic.title}}
              {{else}}
                {{t "backlog.card.noEpic"}}
              {{/if}}
            </span>
          </span>

          <span class="ml-auto flex items-center gap-2 flex-shrink-0">
            <span class="badge badge-sm badge-outline py-2.5">{{t
                "backlog.taskRow.points"
                count=@userStory.points
              }}</span>
            <span
              class="badge badge-sm badge-neutral py-2.5"
              data-test-us-card-task-count
            >{{this.taskCount}} {{t "backlog.card.tasksCount"}}</span>
          </span>
        </div>

        {{#if @expanded}}
          <ul
            class="border-t border-base-300 pt-2 space-y-1"
            data-test-us-card-tasks
          >
            {{#each @tasks as |task|}}
              <li>
                <button
                  type="button"
                  class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm bg-base-200 hover:bg-base-300"
                  data-test-us-card-task={{task.id}}
                  {{on "click" (fn this.openTask task)}}
                >
                  <span
                    class="opacity-50 text-xs flex-shrink-0"
                  >#{{task.number}}</span>
                  <span class="flex-1 min-w-0 truncate">{{task.title}}</span>
                  <TaskStatusBadge @status={{task.status}} />
                </button>
              </li>
            {{else}}
              <li
                class="text-xs opacity-60 italic px-2 py-1"
                data-test-us-card-tasks-empty
              >{{t "user-story-map.noTasks"}}</li>
            {{/each}}
          </ul>
        {{/if}}
      </div>
    </div>
  </template>
}
