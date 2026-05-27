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
    onOpenTask?: (task: Task) => void;
    onEditEpic?: (epic: Epic) => void;
    onDeleteEpic?: (epic: Epic) => void;
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

  get totalPoints(): number {
    return this.epicUserStories.reduce((sum, us) => sum + (us.points ?? 0), 0);
  }

  @action toggleExpand() {
    this.expanded = !this.expanded;
  }

  <template>
    <div class="rounded-lg bg-base-200" data-test-epic-row ...attributes>
      <div
        class="flex items-center gap-2 px-4 py-3 hover:bg-base-300 rounded-lg"
      >
        <button
          type="button"
          class="flex flex-1 items-center gap-3 text-left min-w-0"
          data-test-epic-toggle
          {{on "click" this.toggleExpand}}
          aria-expanded={{this.expanded}}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="size-4 flex-shrink-0 opacity-60 transition-transform
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
            class="badge badge-sm badge-secondary font-semibold uppercase tracking-wider flex-shrink-0"
          >
            {{t "user-story-map.epicLabel"}}
          </span>

          <div class="flex-1 min-w-0">
            <span class="font-semibold">{{@epic.title}}</span>
            <p
              class="text-sm text-base-content/70 truncate"
            >{{@epic.description}}</p>
          </div>
        </button>

        <div class="flex-shrink-0 flex items-center gap-3">
          <span
            class="text-xs text-base-content/60 hidden sm:flex items-center gap-1"
          >
            {{this.usCount}}
            {{t "user-story-map.usCount"}}
            •
            {{this.taskCount}}
            {{t "user-story-map.taskCount"}}
            •
            {{this.totalPoints}}
            {{t "user-story-map.pointsAbbr"}}
          </span>

          <div class="flex items-center gap-1">
            {{#if @onAddUserStory}}
              <button
                type="button"
                class="btn btn-ghost btn-xs btn-circle tooltip tooltip-left"
                data-tip={{t "user-story-map.addUserStoryTooltip"}}
                data-test-add-us-to-epic
                {{on "click" (fn @onAddUserStory @epic)}}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="size-4"
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

            {{#if @onEditEpic}}
              <button
                type="button"
                class="btn btn-ghost btn-xs btn-circle tooltip tooltip-left"
                data-tip={{t "user-story-map.editEpicTooltip"}}
                data-test-edit-epic
                {{on "click" (fn @onEditEpic @epic)}}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="size-4"
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

            {{#if @onDeleteEpic}}
              <button
                type="button"
                class="btn btn-ghost btn-xs btn-circle text-error tooltip tooltip-left"
                data-tip={{t "user-story-map.deleteEpicTooltip"}}
                data-test-delete-epic
                {{on "click" (fn @onDeleteEpic @epic)}}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="size-4"
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
      </div>

      {{#if this.expanded}}
        <div class="border-t border-base-300 px-4 py-2 space-y-2">
          {{#each this.epicUserStories as |us|}}
            <UserStoryRow
              @userStory={{us}}
              @tasks={{@tasks}}
              @onOpenTask={{@onOpenTask}}
            />
          {{else}}
            <p class="py-3 text-sm opacity-40">{{t
                "user-story-map.noUserStories"
              }}</p>
          {{/each}}

          {{#if @onAddUserStory}}
            <button
              type="button"
              class="btn btn-ghost btn-xs text-secondary"
              {{on "click" (fn @onAddUserStory @epic)}}
            >
              +
              {{t "user-story-map.addUserStoryInline"}}
            </button>
          {{/if}}
        </div>
      {{/if}}
    </div>
  </template>
}
