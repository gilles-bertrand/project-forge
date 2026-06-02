import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { concat, fn } from '@ember/helper';
import { on } from '@ember/modifier';
import { t } from 'ember-intl';
import type {
  StoryPriority,
  StoryStatus,
  UserStory,
} from '../schemas/user-stories.ts';
import type { Task } from '../schemas/tasks.ts';
import TaskRow from './task-row.gts';

// daisyUI badge palette per priority. Critique gets `error` so it stands out
// at a glance; Haute keeps `warning`; Moyenne is neutral; Basse fades back.
const PRIORITY_BADGE_CLASS: Record<StoryPriority, string> = {
  Basse: 'badge-ghost',
  Moyenne: 'badge-info',
  Haute: 'badge-warning',
  Critique: 'badge-error',
};

// Status indicator color follows the 6-state iceScrum workflow grouped into
// "sandbox" (suggested), "ready for sprint" (accepted/estimated),
// "in flight" (planned/in-progress) and "completed" (done).
const STATUS_DOT_CLASS: Record<StoryStatus, string> = {
  suggested: 'bg-base-300',
  accepted: 'bg-info/70',
  estimated: 'bg-info',
  planned: 'bg-primary/70',
  'in-progress': 'bg-primary',
  done: 'bg-success',
};

interface UserStoryRowSignature {
  Args: {
    userStory: UserStory;
    tasks?: Task[];
    onOpenTask?: (task: Task) => void;
    onEditUserStory?: (us: UserStory) => void;
    onDeleteUserStory?: (us: UserStory) => void;
    onAddTask?: (us: UserStory) => void;
  };
  Element: HTMLDivElement;
}

export default class UserStoryRow extends Component<UserStoryRowSignature> {
  @tracked expanded = false;

  get storyTasks(): Task[] {
    return (this.args.tasks ?? []).filter(
      (t) => t.userStoryId === this.args.userStory.id
    );
  }

  @action toggleExpand() {
    this.expanded = !this.expanded;
  }

  get priorityBadgeClass(): string {
    const priority = this.args.userStory.priority ?? 'Moyenne';
    return PRIORITY_BADGE_CLASS[priority] ?? 'badge-ghost';
  }

  get statusDotClass(): string {
    return STATUS_DOT_CLASS[this.args.userStory.status] ?? 'bg-base-300';
  }

  <template>
    <div
      class="ml-4 rounded-lg bg-base-100"
      data-test-user-story-row
      ...attributes
    >
      <div
        class="flex items-center gap-2 px-3 py-3 hover:bg-base-200 rounded-lg"
      >
        <button
          type="button"
          class="flex flex-1 items-center gap-3 text-left min-w-0"
          {{on "click" this.toggleExpand}}
          aria-expanded={{this.expanded}}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="size-3 flex-shrink-0 opacity-40 transition-transform
              {{if this.expanded 'rotate-90'}}"
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

          <span
            class="badge badge-xs badge-primary badge-soft font-medium uppercase tracking-wider"
          >
            {{t "user-story-map.usLabel"}}
          </span>

          <span
            class="size-2 rounded-full flex-shrink-0 {{this.statusDotClass}}"
            data-test-us-status-dot
            data-test-us-status={{@userStory.status}}
            aria-label={{t (concat "backlog.status." @userStory.status)}}
            title={{t (concat "backlog.status." @userStory.status)}}
          ></span>

          <span
            class="badge badge-xs {{this.priorityBadgeClass}} font-medium"
            data-test-us-priority={{@userStory.priority}}
          >
            {{t (concat "backlog.priority." @userStory.priority)}}
          </span>

          <span class="flex-1 min-w-0 truncate text-sm font-medium">
            {{@userStory.title}}
          </span>

          <span
            class="flex-shrink-0 flex items-center gap-2 text-xs opacity-50"
          >
            <span>{{t "backlog.taskRow.points" count=@userStory.points}}</span>
            <span>{{this.storyTasks.length}}
              {{t "user-story-map.tasks"}}</span>
          </span>
        </button>

        <div class="flex items-center gap-1 flex-shrink-0">
          {{#if @onAddTask}}
            <button
              type="button"
              class="btn btn-ghost btn-xs btn-circle tooltip tooltip-left"
              data-tip={{t "user-story-map.addTaskTooltip"}}
              aria-label={{t "user-story-map.addTaskTooltip"}}
              data-test-add-task-to-us
              {{on "click" (fn @onAddTask @userStory)}}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="size-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          {{/if}}

          {{#if @onEditUserStory}}
            <button
              type="button"
              class="btn btn-ghost btn-xs btn-circle tooltip tooltip-left"
              data-tip={{t "user-story-map.editUSTooltip"}}
              aria-label={{t "user-story-map.editUSTooltip"}}
              data-test-edit-user-story
              {{on "click" (fn @onEditUserStory @userStory)}}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="size-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
          {{/if}}

          {{#if @onDeleteUserStory}}
            <button
              type="button"
              class="btn btn-ghost btn-xs btn-circle text-error tooltip tooltip-left"
              data-tip={{t "user-story-map.deleteUSTooltip"}}
              aria-label={{t "user-story-map.deleteUSTooltip"}}
              data-test-delete-user-story
              {{on "click" (fn @onDeleteUserStory @userStory)}}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="size-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          {{/if}}
        </div>
      </div>

      {{#if this.expanded}}
        <div class="pl-8 pr-3 pt-1 pb-3 space-y-2">
          {{#each this.storyTasks as |task|}}
            <TaskRow
              @task={{task}}
              @userStory={{@userStory}}
              @onOpen={{@onOpenTask}}
            />
          {{else}}
            <p class="py-2 text-xs opacity-40">{{t
                "user-story-map.noTasks"
              }}</p>
          {{/each}}
        </div>
      {{/if}}
    </div>
  </template>
}
