import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { on } from '@ember/modifier';
import { fn, concat } from '@ember/helper';
import { t } from 'ember-intl';

export interface SearchResult {
  id: string;
  type: 'projects' | 'tasks' | 'user-stories' | 'sprints';
  attributes: { name?: string; title?: string; number?: number };
}

interface SearchDropdownSignature {
  Args: {
    query: string;
    onSelect: (item: SearchResult) => void;
    onClose: () => void;
  };
}

export default class SearchDropdown extends Component<SearchDropdownSignature> {
  @tracked results: SearchResult[] = [];
  @tracked loading = false;
  @tracked lastQuery = '';

  private _debounceTimer: ReturnType<typeof setTimeout> | null = null;

  /* eslint-disable ember/no-side-effects */
  get effectiveQuery(): string {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(
      () => void this.fetchResults(this.args.query),
      250,
    );
    return this.args.query;
  }
  /* eslint-enable ember/no-side-effects */

  get hasResults(): boolean {
    return this.results.length > 0;
  }

  get queryLongEnough(): boolean {
    return this.args.query.length > 1;
  }

  get groupedResults(): Array<{ type: string; items: SearchResult[] }> {
    const types = [
      'projects',
      'tasks',
      'user-stories',
      'sprints',
    ] as const;
    return types
      .map((type) => ({
        type,
        items: this.results.filter((r) => r.type === type),
      }))
      .filter((g) => g.items.length > 0);
  }

  getLabel(item: SearchResult): string {
    if (item.attributes.number != null) {
      return `#${item.attributes.number} ${item.attributes.title ?? ''}`;
    }
    return item.attributes.name ?? item.attributes.title ?? item.id;
  }

  private async fetchResults(query: string): Promise<void> {
    if (query.length < 2) {
      this.results = [];
      this.loading = false;
      return;
    }
    this.loading = true;
    try {
      const qs = `?q=${encodeURIComponent(query)}&types=projects,tasks,user-stories,sprints`;
      const res = await fetch(`/api/v1/search/${qs}`);
      const json = (await res.json()) as { data: SearchResult[] };
      if (this.args.query === query) {
        this.results = json.data;
      }
    } catch {
      this.results = [];
    } finally {
      this.loading = false;
    }
  }

  <template>
    <div
      class="absolute top-full left-0 right-0 mt-1 z-50 bg-base-100 shadow-lg rounded-lg border border-base-300 max-h-96 overflow-y-auto"
      data-test-search-dropdown
    >
      {{! trigger the effectiveQuery getter to schedule debounced fetch }}
      <span hidden>{{this.effectiveQuery}}</span>

      {{#if this.loading}}
        <p class="p-4 text-sm opacity-60">{{t "shell.search.loading"}}</p>
      {{else if this.hasResults}}
        {{#each this.groupedResults as |group|}}
          <div
            class="px-3 py-1 text-xs font-semibold uppercase tracking-wider opacity-50"
          >
            {{t (concat "shell.search.groups." group.type)}}
          </div>
          {{#each group.items as |item|}}
            <button
              type="button"
              class="w-full text-left px-4 py-2 text-sm hover:bg-base-200 flex items-center gap-2"
              {{on "click" (fn @onSelect item)}}
            >
              {{this.getLabel item}}
            </button>
          {{/each}}
        {{/each}}
      {{else if this.queryLongEnough}}
        <p class="p-4 text-sm opacity-60" data-test-empty>
          {{t "shell.search.empty"}}
        </p>
      {{else}}
        <p class="p-4 text-sm opacity-60">{{t "shell.search.minLength"}}</p>
      {{/if}}
    </div>
  </template>
}
