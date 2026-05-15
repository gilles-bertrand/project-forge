import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { t } from 'ember-intl';
import type { UserStory } from '../schemas/user-stories.ts';
import type { Task } from '../schemas/tasks.ts';
import TaskRow from './task-row.gts';

interface UserStoryRowSignature {
  Args: {
    userStory: UserStory;
    tasks?: Task[];
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

  <template>
    <div
      class="ml-4 rounded-lg bg-base-100"
      data-test-user-story-row
      ...attributes
    >
      <button
        type="button"
        class="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-base-200 rounded-lg"
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
          {{t "userStoryMap.usLabel"}}
        </span>

        <span class="flex-1 min-w-0 truncate text-sm font-medium">
          {{@userStory.title}}
        </span>

        <span class="flex-shrink-0 flex items-center gap-2 text-xs opacity-50">
          <span>{{t "backlog.taskRow.points" count=@userStory.points}}</span>
          <span>{{this.storyTasks.length}} {{t "userStoryMap.tasks"}}</span>
        </span>
      </button>

      {{#if this.expanded}}
        <div class="pl-8 pr-3 pb-2 space-y-1">
          {{#each this.storyTasks as |task|}}
            <TaskRow @task={{task}} @userStory={{@userStory}} />
          {{else}}
            <p class="py-2 text-xs opacity-40">{{t "userStoryMap.noTasks"}}</p>
          {{/each}}
        </div>
      {{/if}}
    </div>
  </template>
}
