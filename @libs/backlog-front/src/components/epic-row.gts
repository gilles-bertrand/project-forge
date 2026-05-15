import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import { t } from 'ember-intl';
import type { Epic } from '../schemas/epics.ts';
import type { UserStory } from '../schemas/user-stories.ts';
import type { Task } from '../schemas/tasks.ts';
import UserStoryRow from './user-story-row.gts';

interface EpicRowSignature {
  Args: {
    epic: Epic;
    userStories?: UserStory[];
    tasks?: Task[];
    onAddUserStory?: (epic: Epic) => void;
  };
  Element: HTMLDivElement;
}

export default class EpicRow extends Component<EpicRowSignature> {
  @tracked expanded = false;

  get epicUserStories(): UserStory[] {
    return (this.args.userStories ?? []).filter(
      (us) => us.epicId === this.args.epic.id
    );
  }

  get usCount(): number {
    return this.epicUserStories.length;
  }

  get taskCount(): number {
    return (this.args.tasks ?? []).filter((t) => t.epicId === this.args.epic.id)
      .length;
  }

  @action toggleExpand() {
    this.expanded = !this.expanded;
  }

  <template>
    <div class="rounded-lg bg-base-200" data-test-epic-row ...attributes>
      <button
        type="button"
        class="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-base-300 rounded-lg"
        {{on "click" this.toggleExpand}}
        aria-expanded={{this.expanded}}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="size-4 flex-shrink-0 opacity-50 transition-transform
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
          class="badge badge-sm badge-secondary badge-soft font-semibold uppercase tracking-wider"
        >
          {{t "userStoryMap.epicLabel"}}
        </span>

        <div class="flex-1 min-w-0">
          <span class="font-semibold">{{@epic.title}}</span>
          <p class="text-sm opacity-50 truncate">{{@epic.description}}</p>
        </div>

        <span class="flex-shrink-0 text-xs opacity-50">
          {{this.usCount}}
          {{t "userStoryMap.usCount"}}
          •
          {{this.taskCount}}
          {{t "userStoryMap.taskCount"}}
        </span>
      </button>

      {{#if this.expanded}}
        <div class="border-t border-base-300 px-4 py-2 space-y-2">
          {{#each this.epicUserStories as |us|}}
            <UserStoryRow @userStory={{us}} @tasks={{@tasks}} />
          {{else}}
            <p class="py-3 text-sm opacity-40">{{t
                "userStoryMap.noUserStories"
              }}</p>
          {{/each}}

          {{#if @onAddUserStory}}
            <button
              type="button"
              class="btn btn-ghost btn-xs text-secondary"
              {{on "click" (fn @onAddUserStory @epic)}}
            >
              +
              {{t "userStoryMap.addUserStoryInline"}}
            </button>
          {{/if}}
        </div>
      {{/if}}
    </div>
  </template>
}
