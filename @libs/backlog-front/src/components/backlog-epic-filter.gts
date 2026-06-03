import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import { t } from 'ember-intl';
import type { Epic } from '../schemas/epics.ts';

interface BacklogEpicFilterSignature {
  Element: HTMLDivElement;
  Args: {
    epics: Epic[];
    activeEpicId: string | null;
    onSelect: (epicId: string | null) => void;
  };
}

/**
 * Searchable epic filter dropdown. Scales to many epics: a trigger button
 * shows the active epic, the panel offers a search box plus a scrollable,
 * colour-dotted list. Controlled — the active epic is owned by the caller.
 */
export default class BacklogEpicFilter extends Component<BacklogEpicFilterSignature> {
  @tracked open = false;
  @tracked query = '';

  get activeEpic(): Epic | null {
    if (!this.args.activeEpicId) return null;
    return this.args.epics.find((e) => e.id === this.args.activeEpicId) ?? null;
  }

  get activeDotStyle(): string {
    return `background-color: ${this.activeEpic?.color ?? '#6B7280'}`;
  }

  get filteredEpics(): Epic[] {
    const q = this.query.trim().toLowerCase();
    if (!q) return this.args.epics;
    return this.args.epics.filter((e) => e.title.toLowerCase().includes(q));
  }

  dotStyle = (epic: Epic): string => `background-color: ${epic.color}`;

  @action toggle() {
    this.open = !this.open;
    if (this.open) this.query = '';
  }

  @action close() {
    this.open = false;
  }

  @action onSearch(e: Event) {
    this.query = (e.target as HTMLInputElement).value;
  }

  @action select(epicId: string | null) {
    this.args.onSelect(epicId);
    this.open = false;
  }

  <template>
    <div
      class="relative inline-block"
      data-test-backlog-epic-filter
      ...attributes
    >
      <button
        type="button"
        class="btn btn-sm btn-outline gap-2"
        aria-haspopup="listbox"
        aria-expanded={{this.open}}
        data-test-backlog-epic-filter-toggle
        {{on "click" this.toggle}}
      >
        {{#if this.activeEpic}}
          <span
            class="size-2.5 rounded-full flex-shrink-0"
            style={{this.activeDotStyle}}
            aria-hidden="true"
          ></span>
          {{this.activeEpic.title}}
        {{else}}
          {{t "backlog.filters.allEpics"}}
        {{/if}}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="size-3 opacity-60"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {{#if this.open}}
        <button
          type="button"
          class="fixed inset-0 z-10 cursor-default"
          aria-label={{t "user-story-map.editUserStoryModal.closeAria"}}
          {{on "click" this.close}}
        ></button>
        <div
          class="absolute left-0 z-20 mt-1 w-64 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg"
          role="listbox"
        >
          <input
            type="search"
            class="input input-sm input-bordered w-full mb-2"
            placeholder={{t "backlog.filters.epicSearchPlaceholder"}}
            aria-label={{t "backlog.filters.epicSearchPlaceholder"}}
            value={{this.query}}
            data-test-backlog-epic-search
            {{on "input" this.onSearch}}
          />
          <ul class="max-h-60 overflow-y-auto">
            <li>
              <button
                type="button"
                class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-base-200
                  {{if this.activeEpic '' 'font-semibold'}}"
                data-test-backlog-epic-option-all
                {{on "click" (fn this.select null)}}
              >
                {{t "backlog.filters.allEpics"}}
              </button>
            </li>
            {{#each this.filteredEpics as |epic|}}
              <li>
                <button
                  type="button"
                  class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-base-200"
                  data-test-backlog-epic-option={{epic.id}}
                  {{on "click" (fn this.select epic.id)}}
                >
                  <span
                    class="size-2.5 rounded-full flex-shrink-0"
                    style={{this.dotStyle epic}}
                    aria-hidden="true"
                  ></span>
                  <span class="truncate">{{epic.title}}</span>
                </button>
              </li>
            {{/each}}
          </ul>
        </div>
      {{/if}}
    </div>
  </template>
}
