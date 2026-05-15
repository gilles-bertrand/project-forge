import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { fn, concat } from '@ember/helper';
import { on } from '@ember/modifier';
import { t } from 'ember-intl';
import type { Task, TaskNature, TaskType } from '../schemas/tasks.ts';

const ALL_NATURES: TaskNature[] = [
  'Bug',
  'Feature',
  'Maintenance',
  'Hotfix',
  'Refacto',
  'Techdebt',
  'Spike',
  'Review',
  'Deployment',
  'Infra',
];

const ALL_TYPES: TaskType[] = [
  'Frontend',
  'Backend',
  'Database',
  'UX',
  'Analyse',
  'DevOps',
  'API',
  'Security',
  'Testing',
];

interface BacklogFiltersSignature {
  Args: {
    tasks: Task[];
    onFilter: (filtered: Task[]) => void;
  };
}

export default class BacklogFilters extends Component<BacklogFiltersSignature> {
  @tracked activeNature: TaskNature | null = null;
  @tracked activeType: TaskType | null = null;

  get availableNatures(): TaskNature[] {
    const usedNatures = new Set(this.args.tasks.map((t) => t.nature));
    return ALL_NATURES.filter((n) => usedNatures.has(n));
  }

  get availableTypes(): TaskType[] {
    const usedTypes = new Set(this.args.tasks.map((t) => t.type));
    return ALL_TYPES.filter((tp) => usedTypes.has(tp));
  }

  get filteredTasks(): Task[] {
    return this.args.tasks.filter((task) => {
      if (this.activeNature && task.nature !== this.activeNature) return false;
      if (this.activeType && task.type !== this.activeType) return false;
      return true;
    });
  }

  @action setNature(nature: TaskNature | null) {
    this.activeNature = this.activeNature === nature ? null : nature;
    this.args.onFilter(this.filteredTasks);
  }

  @action setType(type: TaskType | null) {
    this.activeType = this.activeType === type ? null : type;
    this.args.onFilter(this.filteredTasks);
  }

  @action clearAll() {
    this.activeNature = null;
    this.activeType = null;
    this.args.onFilter(this.args.tasks);
  }

  get noFilterActive(): boolean {
    return this.activeNature === null && this.activeType === null;
  }

  isNatureActive = (nature: TaskNature): boolean =>
    this.activeNature === nature;
  isTypeActive = (type: TaskType): boolean => this.activeType === type;

  <template>
    <div
      class="flex flex-wrap items-center gap-2 py-2"
      data-test-backlog-filters
    >
      <button
        type="button"
        class="btn btn-xs {{if this.noFilterActive 'btn-primary' 'btn-ghost'}}"
        {{on "click" this.clearAll}}
      >
        {{t "backlog.filters.all"}}
      </button>

      {{#each this.availableNatures as |nature|}}
        <button
          type="button"
          class="btn btn-xs
            {{if (this.isNatureActive nature) 'btn-secondary' 'btn-ghost'}}"
          {{on "click" (fn this.setNature nature)}}
        >
          {{t (concat "backlog.filters.nature." nature)}}
        </button>
      {{/each}}

      <span class="opacity-30">|</span>

      {{#each this.availableTypes as |type|}}
        <button
          type="button"
          class="btn btn-xs
            {{if (this.isTypeActive type) 'btn-info' 'btn-ghost'}}"
          {{on "click" (fn this.setType type)}}
        >
          {{t (concat "backlog.filters.type." type)}}
        </button>
      {{/each}}
    </div>
  </template>
}
